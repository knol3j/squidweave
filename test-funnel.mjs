import { Funnel } from './src/modules/funnel/funnel-model.mjs';
const f = new Funnel({name: 'Test', description: 'Desc'});
console.log('Funnel id:', f.id);
console.log('Funnel toJSON:', JSON.stringify(f.toJSON()));
