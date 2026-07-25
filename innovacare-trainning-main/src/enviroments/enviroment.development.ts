export const environment = {
    useFunctionsEmulator: false,
    api: {
        // TODO: update once Cloud Functions are deployed to the dev project
        // (innovacaretrainning-dev) — these still point at the production
        // Cloud Run endpoints, so checkout/cart calls made from a dev build
        // will hit production Functions until dedicated dev endpoints exist.
        checkoutUrl: "https://createcheckoutsession-7fz6rnp4pq-uc.a.run.app",
        mergeCartUrl: "https://mergelocalcart-7fz6rnp4pq-uc.a.run.app",
        getCartUrl: "https://getmycart-7fz6rnp4pq-uc.a.run.app",
    },
    firebaseStripe: {
        apiKey: "AIzaSyD0yS0fEMccUQp8qlLqwk7FaThgOq0588Q",
        authDomain: "innovacaretrainning-dev.firebaseapp.com",
        projectId: "innovacaretrainning-dev",
        storageBucket: "innovacaretrainning-dev.firebasestorage.app",
        messagingSenderId: "926620167420",
        appId: "1:926620167420:web:0428109b86102c78ecfb79",
        measurementId: "G-Y1BBN45JM7",
    },
};
