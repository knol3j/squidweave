import { Funnel } from './src/modules/funnel/funnel-model.mjs';
// Simulate readBody for a POST request with JSON body
const body = { name: "Test Funnel", description: "A test funnel for data injection" };
console.log('Body:', body);

const funnel = new Funnel(body);
console.log('Funnel instance id:', funnel.id);
console.log('Funnel instance toJSON:', JSON.stringify(funnel.toJSON()));

// Now simulate upsertDocument logic
const docId = funnel.id;
console.log('docId to pass to upsertDocument:', docId);
console.log('typeof docId:', typeof docId);
