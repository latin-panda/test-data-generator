import { faker } from '@faker-js/faker';

const YES_NO = [ 'yes', 'no' ];

const getPlace = (context, type, nameSuffix) => {
  return {
    type,
    name: `${faker.location.city()}'s ${nameSuffix}`,
    external_id: faker.string.alphanumeric(5),
    notes: faker.lorem.lines(2),
    meta: {
      created_by: context.username,
      created_by_person_uuid: '',
      created_by_place_uuid: ''
    },
    reported_date: faker.date
      .recent({ days: 20 })
      .getTime(),
  };
};

const getDistrictHospital = context => getPlace(context, 'district_hospital', 'Hospital');
const getHealthCenter = context => getPlace(context, 'health_center', 'Health Center');
const getHousehold = context => getPlace(context, 'clinic', 'Household');

const getPerson = (context, role, { sex = faker.person.sex(), ageRange = { min: 20, max: 60 } } = {}) => {
  const dobRaw = faker.date.birthdate({ mode: 'age', ...ageRange});
  const dobFormatted = `${dobRaw.getFullYear()}-${dobRaw.getMonth()}-${dobRaw.getDay()}`;
  return {
    type: 'person',
    name: faker.person.fullName(),
    short_name: faker.person.middleName(),
    date_of_birth: dobFormatted,
    date_of_birth_method: '',
    ephemeral_dob: {
      dob_calendar: dobFormatted,
      dob_method: '',
      dob_approx: dobRaw.toISOString(),
      dob_raw: dobFormatted,
      dob_iso: dobFormatted
    },
    sex,
    phone: faker.helpers.fromRegExp(/[+]2547[0-9]{8}/),
    phone_alternate: '',
    role: role,
    external_id:'',
    notes: '',
    meta: {
      created_by: context.username,
      created_by_person_uuid: '',
      created_by_place_uuid: ''
    },
    reported_date: faker.date.recent({ days: 25 }).getTime(),
  };
};

const getCHWSupervisor = context => getPerson(context, 'chw_supervisor');
const getCHW = context => getPerson(context, 'chw');
const getPatient = context => getPerson(context, 'patient');
const getWoman = context => getPerson(context, 'patient', { sex: 'female', ageRange: { min: 15, max: 45 } });
const getChild = context => getPerson(context, 'patient', { ageRange: { min: 0, max: 14 } });
const getInfant = context => getPerson(context, 'patient', { ageRange: { min: 0, max: 1 } });

const getPregnancyDangerSign = () => {
  return {
    form: 'pregnancy_danger_sign',
    type: 'data_record',
    content_type: 'xml',
    reported_date: faker.date.recent({ days: 5 }).getTime(),
    fields: {
      patient_age_in_years: 34,
      patient_name: 'Erick Loral',
      t_danger_signs_referral_follow_up_date: faker.date.recent({ days: 5 }).toISOString(),
      t_danger_signs_referral_follow_up: 'yes', // Intentionally 'yes'
      danger_signs: {
        danger_signs_note: '',
        danger_signs_question_note: '',
        vaginal_bleeding: 'yes', // Intentionally 'yes'
        fits: faker.helpers.arrayElement(YES_NO),
        severe_abdominal_pain: faker.helpers.arrayElement(YES_NO),
        severe_headache: faker.helpers.arrayElement(YES_NO),
        very_pale: faker.helpers.arrayElement(YES_NO),
        fever: faker.helpers.arrayElement(YES_NO),
        reduced_or_no_fetal_movements: faker.helpers.arrayElement(YES_NO),
        breaking_water: faker.helpers.arrayElement(YES_NO),
        easily_tired: faker.helpers.arrayElement(YES_NO),
        face_hand_swelling: faker.helpers.arrayElement(YES_NO),
        breathlessness: faker.helpers.arrayElement(YES_NO),
        r_danger_sign_present: faker.helpers.arrayElement(YES_NO),
        refer_patient_note_1: '',
        refer_patient_note_2: '',
      },
    },
  };
};

export default (context) => {
  return [
    {
      amount: 2,
      getDoc: () => getDistrictHospital(context),
      children: [
        {
          amount: 2,
          getDoc: () => getHealthCenter(context),
          children: [
            {
              amount: 2,
              getDoc: () => getHousehold(context),
              children: [
                {
                  amount: 1,
                  getDoc: () => getWoman(context),
                  children: [
                    {
                      amount: 1,
                      getDoc: () => getPregnancyDangerSign(),
                    }
                  ]
                },
                { amount: 2, getDoc: () => getChild(context) },
                { amount: 1, getDoc: () => getInfant(context) },
                { amount: 2, getDoc: () => getPatient(context) }
              ]
            },
            {
              amount: 1,
              getDoc: () => getCHW(context),
            }
          ]
        },
        {
          amount: 1,
          getDoc: () => getCHWSupervisor(context),
        }
      ]
    },
  ];
};
