const { Pool } = require('pg');
const _ = require('lodash');

class FHIRtoEMRProcessor {
  constructor(pool) {
    this.pool = pool;
  }

  async processFHIRBundle(fileContent) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const bundle = JSON.parse(fileContent);
      if (!bundle.entry || !Array.isArray(bundle.entry)) {
        throw new Error('Invalid FHIR bundle format');
      }

      // Process resources in order to handle references correctly
      const patients = bundle.entry.filter(e => e.resource.resourceType === 'Patient');
      const encounters = bundle.entry.filter(e => e.resource.resourceType === 'Encounter');
      const medicalRecords = bundle.entry.filter(e => e.resource.resourceType === 'DiagnosticReport');

      // Process patients first
      for (const entry of patients) {
        await this.processPatient(client, entry.resource);
      }

      // Then process encounters and medical records
      for (const entry of encounters) {
        await this.processEncounter(client, entry.resource)
      }

      for (const entry of medicalRecords) {
        await this.processMedicalRecord(client, entry.resource);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing FHIR bundle:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async processPatient(client, patient) {
    const firstName = patient.name?.[0]?.given?.[0] || 'Unknown';
    const lastName = patient.name?.[0]?.family || 'Unknown';
    const dob = patient.birthDate;
    const gender = this.mapGender(patient.gender);
    const address = patient.address?.[0]?.line?.[0];
    const phone = patient.telecom?.find(t => t.system === 'phone')?.value;
    const email = patient.telecom?.find(t => t.system === 'email')?.value || `${firstName}.${lastName}@example.com`;
  
    const query = `
      INSERT INTO Patients (FirstName, LastName, DOB, Gender, Address, PhoneNumber, Email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
      RETURNING PatientID;
    `;
  
    return await client.query(query, [firstName, lastName, dob, gender, address, phone, email]);
  }

  async processEncounter(client, encounter) {
    // Extract patient reference ID
    const patientRef = encounter.subject?.reference;
    if (!patientRef) return;

    const patientId = await this.getPatientIdFromReference(client, patientRef);
    if (!patientId) return;

    // Map to your appointments table
    const query = `
      INSERT INTO Appointments (
        PatientID, DoctorID, AppointmentDate, AppointmentTime, 
        ReasonForVisit, Status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING;
    `;

    await client.query(query, [
      patientId,
      1, // Default doctor ID - you might want to handle this differently
      encounter.period?.start?.split('T')[0],
      encounter.period?.start?.split('T')[1].split('-')[0],
      encounter.type?.[0]?.text || 'General visit',
      this.mapEncounterStatus(encounter.status)
    ]);
  }

  async processMedicalRecord(client, record) {
    const patientRef = record.subject?.reference;
    if (!patientRef) return;

    const patientId = await this.getPatientIdFromReference(client, patientRef);
    if (!patientId) return;

    const query = `
      INSERT INTO MedicalRecords (
        PatientID, DoctorID, VisitDate, Diagnosis, Treatment, Notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING;
    `;

    await client.query(query, [
      patientId,
      1, // Default doctor ID
      record.effectiveDateTime?.split('T')[0],
      'Imported from FHIR',
      'See notes for details',
      record.presentedForm?.[0]?.data || 'No notes available'
    ]);
  }

  async getPatientIdFromReference(client, reference) {
    // Extract ID from FHIR reference (format: "Patient/123")
    const id = reference.split('/')[1];
    const result = await client.query(
      'SELECT PatientID FROM Patients WHERE Email = $1',
      [id] // Using email as a unique identifier
    );
    return result.rows[0]?.patientid;
  }

  mapGender(fhirGender) {
    const genderMap = {
      'male': 'Male',
      'female': 'Female',
      'other': 'Other',
      'unknown': 'Other'
    };
    return genderMap[fhirGender?.toLowerCase()] || 'Other';
  }

  mapEncounterStatus(fhirStatus) {
    const statusMap = {
      'planned': 'Scheduled',
      'arrived': 'Scheduled',
      'triaged': 'Scheduled',
      'in-progress': 'Scheduled',
      'finished': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[fhirStatus] || 'Scheduled';
  }
}

// Example usage:
async function importFHIRData(pool, fhirContent) {
  const processor = new FHIRtoEMRProcessor(pool);
  try {
    await processor.processFHIRBundle(fhirContent);
    console.log('FHIR data imported successfully!');
  } catch (error) {
    console.error('Failed to import FHIR data:', error);
    throw error;
  }
}

module.exports = { FHIRtoEMRProcessor, importFHIRData };