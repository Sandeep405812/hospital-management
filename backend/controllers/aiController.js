import fetch from 'node-fetch';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

/* ─── Hospital AI System Prompt ─────────────────────────────────────────────
   Builds a context-aware system prompt based on the user's role.
   This keeps responses relevant, professional, and safe.
──────────────────────────────────────────────────────────────────────────── */
const buildSystemPrompt = (userRole, userName) => {
  const roleContext = {
    patient: `You are a compassionate Hospital AI Assistant inside CareHMS ERP, helping a PATIENT named ${userName}.
You can help them with:
- Understanding their symptoms and which specialist to consult
- Explaining medical terms in simple Hindi or English
- Helping them prepare questions for their doctor
- Navigating the hospital portal (appointments, prescriptions, reports, billing)
- General health tips and lifestyle advice
- First-aid guidance for non-emergency situations
- Explaining their prescription medicines briefly

IMPORTANT RULES:
- Always recommend consulting a real doctor for diagnosis or treatment
- Never prescribe medicines or give specific dosages
- For emergencies (chest pain, stroke, severe bleeding), immediately say to call 112/102
- Keep answers warm, simple and in Hinglish (mix of Hindi + English) when appropriate
- Always add a brief disclaimer for medical advice`,

    doctor: `You are a clinical AI Assistant inside CareHMS ERP, assisting Dr. ${userName}.
You can help with:
- Quick drug information (mechanism, interactions, common dosages — for reference only)
- Differential diagnosis suggestions (not definitive)
- ICD-10 / medical coding guidance
- Clinical guidelines and protocols (summarized)
- Interpreting lab result ranges
- Patient communication templates
- Research summaries for conditions
- Hospital system navigation (scheduling, patient records, beds)

IMPORTANT RULES:
- Clearly state all information is for professional reference only
- Do not generate formal prescriptions or official medical reports
- Encourage evidence-based decision-making`,

    admin: `You are an administrative AI Assistant inside CareHMS ERP, helping Admin ${userName}.
You can help with:
- Hospital metrics interpretation and reporting
- Staff scheduling best practices
- Healthcare compliance and regulations (general guidance)
- Patient flow optimization suggestions
- Budget and billing management guidance
- Hospital operations Q&A
- IT and system navigation within CareHMS

IMPORTANT RULES:
- Do not share personal patient data
- Keep suggestions aligned with hospital policy and ethics`,

    receptionist: `You are a helpful AI Assistant inside CareHMS ERP, assisting Receptionist ${userName}.
You can help with:
- Patient registration process steps
- Appointment scheduling best practices
- Billing and insurance query handling
- Routing patients to correct departments
- Hospital navigation and department information
- Basic patient communication scripts
- Emergency escalation procedures

IMPORTANT RULES:
- Always route medical questions to appropriate doctors
- Maintain patient confidentiality in all guidance`,
  };

  return (
    roleContext[userRole] ||
    `You are a helpful Hospital AI Assistant inside CareHMS ERP. Answer questions related to healthcare, hospital navigation, and general wellness. Always recommend consulting medical professionals for health concerns.`
  );
};

/* ─── Controller: chatWithAI ─────────────────────────────────────────────── */
export const chatWithAI = async (req, res) => {
  try {
    const { message, userRole, userName, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      return res.status(503).json({
        message: 'AI service is not configured. Please set GEMINI_API_KEY in backend .env file.',
      });
    }

    // Build conversation history for multi-turn context
    const conversationHistory = history
      .slice(-10) // Keep last 10 messages for context window efficiency
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      }));

    // Auto-detect Patient ID query if asked by doctor/admin (e.g. PID-1001)
    let patientContextExtra = '';
    const pidMatch = message.match(/PID-\d+/i);
    if (pidMatch && (userRole === 'doctor' || userRole === 'admin' || userRole === 'receptionist')) {
      try {
        const Patient = (await import('../models/Patient.js')).default;
        const Appointment = (await import('../models/Appointment.js')).default;
        const Prescription = (await import('../models/Prescription.js')).default;

        const foundPatient = await Patient.findOne({
          patientId: pidMatch[0].toUpperCase()
        }).populate('user', 'name email phoneNumber gender');

        if (foundPatient) {
          const pastApps = await Appointment.find({ patient: foundPatient._id })
            .populate('department', 'name')
            .sort({ date: -1 })
            .limit(5);

          const pastPrescs = await Prescription.find({ patient: foundPatient._id })
            .sort({ createdAt: -1 })
            .limit(3);

          patientContextExtra = `\n\n[PATIENT RECORD RETRIEVED FROM DATABASE FOR ID: ${foundPatient.patientId}]
Name: ${foundPatient.user?.name || 'N/A'}
Gender: ${foundPatient.user?.gender || 'N/A'}
Blood Type: ${foundPatient.bloodType || 'N/A'}
Emergency Contact: ${foundPatient.emergencyContact || 'N/A'}
Allergies: ${foundPatient.allergies?.join(', ') || 'None recorded'}
Medical History: ${foundPatient.medicalHistory?.join(', ') || 'None recorded'}
Past Appointments (${pastApps.length}): ${pastApps.map(a => `${new Date(a.date).toISOString().split('T')[0]}: ${a.symptoms} (${a.status})`).join(' | ') || 'None'}
Recent Prescriptions (${pastPrescs.length}): ${pastPrescs.map(p => `${p.diagnosis || 'Prescription'}: ${p.medicines?.map(m => m.name).join(', ')}`).join(' | ') || 'None'}
[END OF PATIENT RECORD]
You MUST summarize this retrieved patient data clearly and professionally for the doctor.`;
        } else {
          patientContextExtra = `\n\n[SYSTEM NOTICE: Patient with ID ${pidMatch[0].toUpperCase()} was not found in the hospital database. Please inform the doctor to double check the ID.]`;
        }
      } catch (err) {
        console.error('Error fetching patient record for AI context:', err);
      }
    }

    const systemPrompt = buildSystemPrompt(userRole, userName) + patientContextExtra;

    // Add current user message
    conversationHistory.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const requestBody = {
      // Inject system context as the first user/model pair
      contents: [
        {
          role: 'user',
          parts: [{ text: `[SYSTEM CONTEXT]\n${systemPrompt}\n\n[BEGIN CONVERSATION]` }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood! I am CareHMS AI Assistant, ready to help. How can I assist you today?' }],
        },
        ...conversationHistory,
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.65,
        topP: 0.9,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    // Auto-retry with backoff for high-demand spikes
    const MODEL_NAME = 'gemini-3.8-flash';
    const MAX_RETRIES = 3;
    let replyText = null;
    let lastErrorMessage = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
        const geminiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          replyText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return res.json({ reply: replyText });
          }
        } else {
          const errData = await geminiResponse.json().catch(() => ({}));
          lastErrorMessage = errData?.error?.message || `HTTP ${geminiResponse.status}`;
          console.warn(`[AI Attempt ${attempt}/${MAX_RETRIES}] Gemini response not ok: ${lastErrorMessage}`);

          // If high demand / traffic spike, wait with progressive backoff before retrying
          if (attempt < MAX_RETRIES) {
            const waitTime = attempt * 1200; // 1.2s, 2.4s
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise((res) => setTimeout(res, waitTime));
          }
        }
      } catch (callErr) {
        lastErrorMessage = callErr.message;
        console.warn(`[AI Attempt ${attempt}] Network error:`, callErr.message);
        if (attempt < MAX_RETRIES) {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }

    // Graceful response if temporary spike persists
    if (!replyText) {
      if (lastErrorMessage && (lastErrorMessage.includes('high demand') || lastErrorMessage.includes('Spikes'))) {
        return res.json({
          reply: `Namaste ${userName || ''}! 🙏 AI Clinical servers par abhi temporary traffic spike (high demand) hai. Kripya 10-15 seconds baad dobara try karein ya portal par doctor appointment book karein. 🏥`,
        });
      }

      return res.status(502).json({
        message: `AI service error: ${lastErrorMessage || 'Service temporarily busy. Please try again.'}`,
      });
    }

    return res.json({ reply: replyText });
  } catch (error) {
    console.error('AI Controller Error:', error);
    return res.status(500).json({
      message: 'Internal server error while processing AI request.',
    });
  }
};
