// Configurare Inventar PDA
// 1) demo: true  -> aplicația rulează local, fără Firebase (date doar în acest browser) — pentru test
// 2) demo: false -> completează datele proiectului Firebase (Project settings -> Your apps -> Web app)
window.INVENTAR_CONFIG = {
  demo: true,
  appName: "Inventar PDA",
  // domeniul fictiv folosit pentru conturile nume + PIN
  authDomainSuffix: "inventar.local",
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};
