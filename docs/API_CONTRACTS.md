# API Contracts (formato Frontend)

Base URL: `http://localhost:4000`
Prefix: `v1`
URL completa API: `http://localhost:4000/v1`

Respuesta exitosa (wrapper global):
response:
{
  success: boolean;
  data: unknown;
  message?: string;
  timestamp: string;
}

Nota: por el guard global, **todos los endpoints requieren** `Authorization: Bearer <token>` excepto los que se marcan como público.

---

## Módulo: App

url: GET v1/
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: string;
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: Auth

url: POST v1/auth/login (público)
dto:
{
  headers: {};
  params: {};
  query: {};
  body: { phone: string; password: string; };
}
response:
{
  success: boolean;
  data: {
    accessToken: string;
    user: { id: string; name: string; lastName: string; phone: string; email: string; };
  };
  message?: string;
  timestamp: string;
}
code: 200

url: POST v1/auth/forgot-password (público)
dto:
{
  headers: {};
  params: {};
  query: {};
  body: { phone: string; };
}
response:
{
  success: boolean;
  data: { message: string; };
  message?: string;
  timestamp: string;
}
code: 200
note: Genera OTP de 6 dígitos, lo guarda en caché (10 min), envía el código por WhatsApp (Twilio). Respuesta genérica siempre (no revela si el número está registrado).

url: POST v1/auth/reset-password (público)
dto:
{
  headers: {};
  params: {};
  query: {};
  body: {
    phone: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  };
}
response:
{
  success: boolean;
  data: { message: string; };
  message?: string;
  timestamp: string;
}
code: 200
note: Valida OTP contra caché, newPassword === confirmPassword, actualiza User.password. 400 si OTP inválido/expirado (invalid-or-expired-otp) o contraseñas no coinciden (passwords-do-not-match).

url: POST v1/auth/logout
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: { message: string; };
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: Patients

url: POST v1/patients
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {
    email: string;
    name: string;
    lastName: string;
    phone: string;
    address: string;
    password?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
  };
}
response:
{
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string;
    address?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 201

url: GET v1/patients
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: Array<{
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string;
    address?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  message?: string;
  timestamp: string;
}
code: 200

url: GET v1/patients/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string;
    address?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

url: PATCH v1/patients/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {
    email?: string;
    name?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    password?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
  };
}
response:
{
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string;
    address?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

url: DELETE v1/patients/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response: {}
code: 204

url: GET v1/patients/:id/antecedents
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: {
    patientId: string;
    allergies: string[];
    medications: string[];
    medicalHistory: string[];
    familyHistory: string[];
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

url: PUT v1/patients/:id/antecedents
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {
    allergies?: string[];
    medications?: string[];
    medicalHistory?: string[];
    familyHistory?: string[];
  };
}
response:
{
  success: boolean;
  data: {
    patientId: string;
    allergies: string[];
    medications: string[];
    medicalHistory: string[];
    familyHistory: string[];
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: Appointments

url: POST v1/appointments
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: string;
    endAppointment: string;
    reason: string;
  };
}
response:
{
  success: boolean;
  data: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: string;
    endAppointment: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    reason: string;
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 201

url: GET v1/appointments
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: Array<{
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: string;
    endAppointment: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    reason: string;
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  }>;
  message?: string;
  timestamp: string;
}
code: 200

url: GET v1/appointments/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: string;
    endAppointment: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    reason: string;
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

url: PATCH v1/appointments/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {
    startAppointment?: string;
    endAppointment?: string;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    reason?: string;
  };
}
response:
{
  success: boolean;
  data: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: string;
    endAppointment: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    reason: string;
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

url: POST v1/appointments/:id/cancel
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: string;
    endAppointment: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    reason: string;
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

url: GET v1/patients/:patientId/appointments
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { patientId: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: Array<{
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: string;
    endAppointment: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    reason: string;
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  }>;
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: Clinic Histories

url: POST v1/clinic-histories
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {
    appointmentId: string;
    consultationReason: string;
    symptoms: string[];
    treatment: string;
    diagnostics: Array<{ name: string; description: string; }>;
    physicalExams: Array<{ name: string; description: string; }>;
    vitalSigns: Array<{ name: string; value: string; unit: string; measurement: string; description?: string; }>;
    prescription?: {
      name: string;
      description: string;
      medications: Array<{
        name: string;
        quantity: number;
        unit: string;
        frequency: string;
        duration: string;
        indications: string;
        administrationRoute: string;
        description?: string;
      }>;
    };
  };
}
response:
{
  success: boolean;
  data: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    appointmentId: string;
    consultationReason: string;
    symptoms: string[];
    treatment: string;
    diagnostics: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    physicalExams: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    vitalSigns: Array<{ id: string; name: string; value: string; unit: string; measurement: string; description?: string; createdAt: string; }>;
    prescription?: {
      id: string;
      name: string;
      description: string;
      medications: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        frequency: string;
        duration: string;
        indications: string;
        administrationRoute: string;
        description?: string;
      }>;
      createdAt: string;
    };
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 201

url: GET v1/clinic-histories
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: Array<{
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    appointmentId: string;
    consultationReason: string;
    symptoms: string[];
    treatment: string;
    diagnostics: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    physicalExams: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    vitalSigns: Array<{ id: string; name: string; value: string; unit: string; measurement: string; description?: string; createdAt: string; }>;
    prescription?: {
      id: string;
      name: string;
      description: string;
      medications: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        frequency: string;
        duration: string;
        indications: string;
        administrationRoute: string;
        description?: string;
      }>;
      createdAt: string;
    };
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  }>;
  message?: string;
  timestamp: string;
}
code: 200

url: GET v1/clinic-histories/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    appointmentId: string;
    consultationReason: string;
    symptoms: string[];
    treatment: string;
    diagnostics: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    physicalExams: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    vitalSigns: Array<{ id: string; name: string; value: string; unit: string; measurement: string; description?: string; createdAt: string; }>;
    prescription?: {
      id: string;
      name: string;
      description: string;
      medications: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        frequency: string;
        duration: string;
        indications: string;
        administrationRoute: string;
        description?: string;
      }>;
      createdAt: string;
    };
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

url: GET v1/patients/:patientId/clinic-histories
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { patientId: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: Array<{
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    appointmentId: string;
    consultationReason: string;
    symptoms: string[];
    treatment: string;
    diagnostics: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    physicalExams: Array<{ id: string; name: string; description: string; createdAt: string; }>;
    vitalSigns: Array<{ id: string; name: string; value: string; unit: string; measurement: string; description?: string; createdAt: string; }>;
    prescription?: {
      id: string;
      name: string;
      description: string;
      medications: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        frequency: string;
        duration: string;
        indications: string;
        administrationRoute: string;
        description?: string;
      }>;
      createdAt: string;
    };
    patient: { id: string; name: string; lastName: string; };
    doctor: { id: string; name: string; lastName: string; specialty: string; };
    createdAt: string;
    updatedAt: string;
  }>;
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: OpenAI

url: POST v1/openai/message
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: { phone: string; message: string; };
}
response:
{
  success: boolean;
  data: { success: true; response: string; };
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: Conversations

url: GET v1/conversations
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: Array<{
    id: string;
    model: string;
    systemPrompt: string;
    summary?: string;
    lastActivityAt: string;
    isActive: boolean;
    doctorId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  message?: string;
  timestamp: string;
}
code: 200

url: GET v1/conversations/:id/messages
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: Array<{
    id: string;
    conversationId?: string;
    role: 'user' | 'assistant';
    content: string;
    tokenCount: number;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  message?: string;
  timestamp: string;
}
code: 200

url: PUT v1/conversations/:id/read
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: { updatedCount: number; };
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: Messages

url: POST v1/messages
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: { conversationId: string; role?: 'user' | 'assistant'; content: string; };
}
response:
{
  success: boolean;
  data: {
    id: string;
    conversationId?: string;
    role: 'user' | 'assistant';
    content: string;
    tokenCount: number;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  timestamp: string;
}
code: 201

---

## Módulo: Twilio WhatsApp

url: POST v1/twilio/whatsapp/send
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: { to: string; body: string; };
}
response:
{
  success: boolean;
  data: { success: boolean; messageSid: string; status: string; };
  message?: string;
  timestamp: string;
}
code: 200

url: POST v1/twilio/webhook/whatsapp (público)
dto:
{
  headers: {};
  params: {};
  query: {};
  body: {
    MessageSid: string;
    AccountSid: string;
    From: string;
    To: string;
    Body: string;
    NumMedia?: number;
    MediaUrl0?: string;
    MediaContentType0?: string;
    SmsStatus?: string;
    Timestamp?: string;
  };
}
response: {}
code: 200
note: La respuesta al mensaje del usuario se realiza con la SDK de Twilio (Messages API), no con el body de la respuesta HTTP. El endpoint devuelve 200 con cuerpo vacío para confirmar a Twilio que el webhook fue procesado.

url: GET v1/twilio/message/:messageSid/status
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { messageSid: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: {
    sid: string;
    status: string;
    to: string;
    from: string;
    body: string;
    dateCreated: string;
    dateSent?: string;
    dateUpdated: string;
    price?: string;
    priceUnit?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  message?: string;
  timestamp: string;
}
code: 200

---

## Módulo: User

url: POST v1/user
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: string;
  message?: string;
  timestamp: string;
}
code: 201

url: GET v1/user
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: {};
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: string;
  message?: string;
  timestamp: string;
}
code: 200

url: GET v1/user/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: string;
  message?: string;
  timestamp: string;
}
code: 200

url: PATCH v1/user/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: string;
  message?: string;
  timestamp: string;
}
code: 200

url: DELETE v1/user/:id
dto:
{
  headers: { Authorization: 'Bearer <token>' };
  params: { id: string; };
  query: {};
  body: {};
}
response:
{
  success: boolean;
  data: string;
  message?: string;
  timestamp: string;
}
code: 200
