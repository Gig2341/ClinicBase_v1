let patientId = null;
let caseId = null;
let fetchedPatientData = [];

function getPatientQueue () {
  const radioList = document.getElementById('radio-button-list');

  radioList.innerHTML = '';

  fetch('https://clinicbase.tech/api/cases/queue')
    .then(response => {
      return response.json();
    })
    .then(data => {
      fetchedPatientData = data;

      data.forEach(patient => {
        const listItem = document.createElement('li');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.id = `patient${patient.id}`;
        radio.name = 'patient';
        radio.value = patient.id;
        const label = document.createElement('label');
        label.htmlFor = `patient${patient.id}`;
        label.textContent = `First Name: ${patient.firstname}, Surname: ${patient.surname}`;
        listItem.appendChild(radio);
        listItem.appendChild(label);
        radioList.appendChild(listItem);
      });

      radioList.addEventListener('click', handleSelection);
    });
}

function handleSelection () {
  const selectedRadio = document.querySelector('input[name="patient"]:checked');

  if (selectedRadio) {
    patientId = selectedRadio.value;
    const selectedPatient = fetchedPatientData.find(patient => patient.id === patientId);

    if (selectedPatient) {
      displayPatientInfo(selectedPatient);
    }
  }
}

function createNewCase (patientId) {
  if (patientId) {
    const optomId = document.getElementById('optom-info').getAttribute('data-optom-info');

    fetch('https://clinicbase.tech/api/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        optom_id: optomId,
        patient_id: patientId
      })
    })
      .then(response => {
        return response.json();
      })
      .then(data => {
        displayPatientInfo(data, 'created');
        caseId = data.id;
      });
  }
}

function initializeSaveHandler () {
  const saveButton = document.getElementById('save');
  saveButton.addEventListener('click', function () {
    if (caseId) {
      const allFormInfo = {};

      function collectAndAddFormDataSection (sectionName, form) {
        const formData = collectFormData(form);
        const hasNonEmptyField = Object.values(formData).some(value => value.trim() !== '');

        if (hasNonEmptyField) {
          allFormInfo[sectionName] = formData;
        }
      }

      collectAndAddFormDataSection('histories', document.getElementById('History'));
      collectAndAddFormDataSection('examinations', document.getElementById('Examination'));
      collectAndAddFormDataSection('diagnoses', document.getElementById('Diagnosis'));
      collectAndAddFormDataSection('drugs', document.getElementById('Medication'));
      collectAndAddFormDataSection('tests', document.getElementById('Tests'));
      collectAndAddFormDataSection('lenses', document.getElementById('Lens Prescription'));

      fetch(`https://clinicbase.tech/api/cases/save/${caseId}`, {
        method: 'POST',
        body: JSON.stringify(allFormInfo),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          return response.json();
        })
        .then(data => {
          displayPatientInfo(data, 'saved');
        });
    }
  });
}

function initializeSubmitHandler () {
  const submitButton = document.getElementById('submit');
  submitButton.addEventListener('click', function () {
    if (selectedCommentId) {
      const allFormInfo = {};

      function collectAndAddFormDataSection (sectionName, form) {
        const formData = collectFormData(form);
        const hasNonEmptyField = Object.values(formData).some(value => value.trim() !== '');

        if (hasNonEmptyField) {
          allFormInfo[sectionName] = formData;
        }
      }

      collectAndAddFormDataSection('histories', document.getElementById('History'));
      collectAndAddFormDataSection('examinations', document.getElementById('Examination'));
      collectAndAddFormDataSection('diagnoses', document.getElementById('Diagnosis'));
      collectAndAddFormDataSection('drugs', document.getElementById('Medication'));
      collectAndAddFormDataSection('tests', document.getElementById('Tests'));
      collectAndAddFormDataSection('lenses', document.getElementById('Lens Prescription'));

      const apiUrl = `127.0.0.1:5000/api/cases/submit/${selectedCommentId}`;

      fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(allFormInfo),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          return response.json();
        })
        .then(data => {
          clearFormValues(['History', 'Examination', 'Diagnosis', 'Medication', 'Tests', 'Lens Prescription']);
        });
    }
  });
}

function collectFormData (formId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const formInfo = {};
  formData.forEach((value, key) => {
    formInfo[key] = value;
  });
  return formInfo;
}

function clearFormValues (formIds) {
  formIds.forEach(formId => document.getElementById(formId).reset());
}
function displayPatientInfo (data, estatus) {
  const patientInfoElement = document.getElementById('responseContainer');
  let statusHTML = '';

  if (estatus) {
    statusHTML = `<h4>Status:</h4><p>Case for the below Patient has been successfully ${estatus}</p>`;
  }
  patientInfoElement.innerHTML = `${statusHTML}<h4>Patient Information:</h4>
    <div>
        <p>First Name: ${data.firstname}</p>
        <p>Surname: ${data.surname}</p>
    </div>
    <div>
        <p>Date of Birth: ${data.dob}</p>
        <p>Contact: ${data.tel}</p>
    </div>
    <div>
        <p>Occupation: ${data.occupation}</p>
        <p>Insurance: ${data.insurance}</p>
    </div>`;
}
