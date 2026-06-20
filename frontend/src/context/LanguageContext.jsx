import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    dashboard: 'Dashboard',
    appointments: 'Appointments',
    symptomChecker: 'Symptom Checker',
    healthTracker: 'Health Tracker',
    doctors: 'Doctors',
    patients: 'Patients',
    prescriptions: 'Prescriptions',
    billingInvoices: 'Billing / Invoices',
    medicalReports: 'Medical Reports',
    departments: 'Departments',
    myProfile: 'My Profile',
    beds: 'Bed Management',
    surgeries: 'Surgery / OT Slots',
    waitingRoom: 'Waiting Room Display',
    logout: 'Logout',
    signIn: 'Sign In',
    welcomeBack: 'Welcome back',
    welcomeSubtitle: "Here is what's happening at AS HOSPITAL today",
    bookAppointment: 'Book Appointment',
    totalDoctors: 'Total Doctors',
    totalPatients: 'Total Patients',
    pendingApproval: 'Pending Approval',
    unpaidInvoices: 'Unpaid Invoices',
    recentAppointments: 'Recent Appointments',
    viewAll: 'View All',
    secSecureCheckout: 'Secure Checkout',
    grandTotal: 'Grand Total',
    confirmProcessPayment: 'Confirm & Process Payment',
    queuePosition: 'Queue Position',
    estWaitTime: 'Est. Wait Time',
    symptoms: 'Symptoms',
    status: 'Status',
    actions: 'Actions',
    cancel: 'Cancel',
  },
  hn: {
    dashboard: 'डैशबोर्ड',
    appointments: 'नियुक्तियां (अपॉइंटमेंट)',
    symptomChecker: 'लक्षण जांचकर्ता',
    healthTracker: 'स्वास्थ्य ट्रैकर',
    doctors: 'डॉक्टरों की सूची',
    patients: 'मरीजों की सूची',
    prescriptions: 'नुस्खे (प्रिस्क्रिप्शन)',
    billingInvoices: 'बिलिंग / चालान',
    medicalReports: 'मेडिकल रिपोर्ट्स',
    departments: 'अस्पताल विभाग',
    myProfile: 'मेरी प्रोफाइल',
    beds: 'बिस्तर (बेड) प्रबंधन',
    surgeries: 'सर्जरी / ओटी बुकिंग',
    waitingRoom: 'प्रतीक्षा कक्ष टीवी स्क्रीन',
    logout: 'लॉगआउट',
    signIn: 'साइन इन करें',
    welcomeBack: 'आपका स्वागत है',
    welcomeSubtitle: 'आज एएस अस्पताल में क्या हो रहा है, यहां देखें',
    bookAppointment: 'अपॉइंटमेंट बुक करें',
    totalDoctors: 'कुल डॉक्टर',
    totalPatients: 'कुल मरीज',
    pendingApproval: 'मंजूरी पेंडिंग',
    unpaidInvoices: 'बकाया बिल',
    recentAppointments: 'हाल के अपॉइंटमेंट्स',
    viewAll: 'सभी देखें',
    secSecureCheckout: 'सुरक्षित भुगतान',
    grandTotal: 'कुल देय राशि',
    confirmProcessPayment: 'भुगतान की पुष्टि करें',
    queuePosition: 'कतार नंबर',
    estWaitTime: 'अनुमानित समय',
    symptoms: 'लक्षण',
    status: 'स्थिति',
    actions: 'कार्रवाई',
    cancel: 'रद्द करें',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hn' : 'en'));
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
