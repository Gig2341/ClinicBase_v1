#!/usr/bin/python3
""" API cases routes """

from api import bp_api
from flask import abort, jsonify, request, make_response
from datetime import date, datetime
from models.case import Case
from models.patient import Patient
from flask_login import current_user, login_required
from operator import attrgetter
import uuid
from sqlalchemy import func, select
from models import storage
from models.engine.db_storage import DBStorage

db_storage = DBStorage()
session = db_storage.reload()


@bp_api.route('/get_case/<case_id>', strict_slashes=False)
@login_required
def get_case(case_id):
    """ Returns patient's case """
    case = storage.get(Case, case_id)
    if not case:
        abort(404)
    return jsonify(case.to_dict())


@bp_api.route('/cases/<patient_id>', strict_slashes=False)
@login_required
def new_case(patient_id):
    """ Creates a new case """
    data = {
        'optometrist_id': current_user.id,
        'patient_id': patient_id
    }

    existing_case = session.query(Case).filter(
        Case.patient_id == patient_id,
        func.date(Case.created_at) == func.current_date()
    ).first()

    if not existing_case:
        case = Case(**data)
        case.save()
        return jsonify(case.to_dict())
    else:
        return jsonify(existing_case.to_dict())


@bp_api.route('/cases/completed', methods=['GET'], strict_slashes=False)
@login_required
def get_completed_cases():
    """ Gets completed cases with prescription information """
    patients = session.query(Patient)\
        .filter(func.date(Patient.updated_at) == func.current_date()).all()

    matching_cases = []

    for patient in patients:
        for case in patient.cases:
            if (
                func.date(case.updated_at) == func.current_date()
                and case.updated_at > case.created_at
            ):
                matching_cases.append(case)

    matching_cases.sort(key=attrgetter("updated_at"), reverse=True)
    recent_case = matching_cases[:5]
    response = make_response(jsonify([case.to_dict() for case in recent_case]))
    response.headers['ETag'] = str(uuid.uuid4())
    return response


@bp_api.route('/cases/queue', methods=['GET'], strict_slashes=False)
@login_required
def patient_queue():
    """ Gets patients in queue """
    subquery = session.query(Case.patient_id)\
        .filter(Case.updated_at == Case.created_at).subquery()
    subquery_select = select([subquery.c.patient_id])
    patients = session.query(Patient)\
        .filter(Patient.updated_at == func.current_date())\
        .filter(Patient.id.in_(subquery_select)).all()
    patients_data = [patient.to_dict() for patient in patients]
    response = make_response(jsonify(patients_data))
    response.headers['ETag'] = str(uuid.uuid4())
    return response


@bp_api.route('/medical_records/<patient_id>', strict_slashes=False)
@login_required
def get_patient_records(patient_id):
    """ Returns the medical records of a patient """
    cases = session.query(Case).filter(
        Case.patient_id == patient_id
    ).order_by(Case.updated_at.desc()).all()

    case_data = [case.to_dict() for case in cases]
    for case in case_data:
        case.pop("patient_id", None)

    response = make_response(jsonify(case_data))
    response.headers['ETag'] = str(uuid.uuid4())
    return response


@bp_api.route('/cases/save/<case_id>', methods=['POST'], strict_slashes=False)
@login_required
def save_case(case_id):
    """ Saves patient's medical records into a case """
    record_type_mapping = {
        'diagnoses': Diagnosis,
        'examinations': Examination,
        'histories': History,
        'tests': Test,
        'lenses': Lens,
        'drugs': Drug,
    }

    if not request.get_json():
        abort(400, description="Not a JSON")

    case = storage.get(Case, case_id)
    if not case:
        abort(404)

    data = request.get_json()
    ret = []

    if data:
        for record_type, record_data in data.items():
            if record_type in record_type_mapping:
                record_data['case_id'] = case_id
                record_data['patient_id'] = case.patient_id

                RecordClass = record_type_mapping[record_type]

                record = RecordClass.query\
                    .filter_by(case_id=case_id).first()

                if record:
                    record.delete()
                    storage.save()

                record = RecordClass(**record_data)
                record.save()
                ret.append(record.to_dict())

    return jsonify(ret)


@bp_api.route('/cases/submit/<case_id>', methods=['POST'],
              strict_slashes=False)
@login_required
def submit_case(case_id):
    """ Submit patient's medical records into a case for closure """
    record_type_mapping = {
        'diagnoses': Diagnosis,
        'examinations': Examination,
        'histories': History,
        'tests': Test,
        'lenses': Lens,
        'drugs': Drug,
    }

    if not request.get_json():
        abort(400, description="Not a JSON")

    case = storage.get(Case, case_id)
    if not case:
        abort(404)

    data = request.get_json()
    ret = []

    if data:
        for record_type, record_data in data.items():
            if record_type in record_type_mapping:
                record_data['case_id'] = case_id
                record_data['patient_id'] = case.patient_id

                RecordClass = record_type_mapping[record_type]

                record = session.query(RecordClass)\
                    .filter_by(case_id=case_id).first()

                if record:
                    for key, value in record_data.items():
                        setattr(record, key, value)
                        storage.save()
                else:
                    record = RecordClass(**record_data)
                    record.save()

                ret.append(record.to_dict())

    case.updated_at = datetime.utcnow()
    storage.save()

    return jsonify(ret)
