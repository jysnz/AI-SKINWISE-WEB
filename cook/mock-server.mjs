// node cook/mock-server.mjs [port] : stand-in for the SkinWise server's POST /predict-skin-disease (same field names and answer shapes).
// Used with SKINWISE_API_URL=http://localhost:8123 to test the web flow while the real Render service is suspended.
// body_location "Face" answers low confidence, "Foot" answers Unknown, anything else a full result. Prints the fields it received.
import { createServer } from 'node:http';
const port = Number(process.argv[2] || 8123);
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || !req.url.startsWith('/predict-skin-disease')) { res.writeHead(404); return res.end('{}'); }
  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('latin1');
  const fields = {};
  for (const m of raw.matchAll(/name="([^"]+)"(?:; filename="[^"]*")?\r\n(?:Content-Type: [^\r\n]+\r\n)?\r\n([\s\S]*?)\r\n--/g)) {
    fields[m[1]] = /^image_/.test(m[1]) ? '(file ' + m[2].length + ' bytes)' : m[2];
  }
  console.log('RECEIVED', JSON.stringify(fields));
  await new Promise((r) => setTimeout(r, 2500)); // long enough to see the analyzing view
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (!fields.image_1) return send(400, { error: 'No images provided.' });
  if (fields.body_location === 'Face') return send(200, { success: false, low_confidence: true, message: 'The visual and symptom data conflict, or confidence is too low.', details: { visual: 64, match: 52, final: 71 } });
  if (fields.body_location === 'Foot') return send(200, { success: true, prediction: { disease_name: 'Unknown', final_confidence: 41.2, visual_confidence_avg: 41.2, symptom_match_score: 100, symptom_analysis: 'N/A' }, translation: { original: '', english: '' }, info: { description: 'Result: Unknown', suggested_treatment: 'Consult a professional.' } });
  const hasSym = !!(fields.selected_symptoms || fields.user_description);
  return send(200, {
    success: true,
    prediction: { disease_name: 'Ringworm', final_confidence: hasSym ? 89.6 : 84.2, visual_confidence_avg: 84.2, symptom_match_score: hasSym ? 91 : 0, symptom_analysis: hasSym ? 'Symptoms match' : 'No symptoms provided (Visual Only)' },
    translation: { original: fields.selected_symptoms || '', english: fields.selected_symptoms || '' },
    info: { description: 'Test stand-in answer, not real medical content.', expected_symptoms: 'Test symptom one; Test symptom two', suggested_treatment: 'Test remedy one; Test remedy two', references: [{ reference: 'https://example.org/test' }] },
  });
}).listen(port, () => console.log('mock SkinWise server on http://localhost:' + port));
