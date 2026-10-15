import { AutoProcessor, AutoModelForVision2Seq, RawImage } from '@huggingface/transformers'
const REV = { 'HuggingFaceTB/SmolVLM-256M-Instruct': '7e3e67edbbed1bf9888184d9df282b700a323964',
              'HuggingFaceTB/SmolVLM-500M-Instruct': 'a7da5b986cb59b408707209984f360a5f4ad7e47' }
const PROMPT = 'List each food item in this photo with an estimated weight in grams. One item per line, format: <food> - <grams> g. No other text.'
const o = document.getElementById('o'), log = s => (o.textContent += '\n' + s)
const gpu = !!(navigator.gpu && (await navigator.gpu.requestAdapter().catch(() => null)))
o.textContent = `webgpu: ${gpu} · isolated: ${self.crossOriginIsolated} · cores: ${navigator.hardwareConcurrency} · deviceMemory: ${navigator.deviceMemory}`
document.getElementById('f').onchange = async e => {
  const repo = document.getElementById('m').value, revision = REV[repo]
  const device = gpu && !document.getElementById('cpu').checked ? 'webgpu' : 'wasm'
  const dtype = device === 'webgpu'
    ? { embed_tokens: 'fp16', vision_encoder: 'q4', decoder_model_merged: 'q4' }
    : { embed_tokens: 'int8', vision_encoder: 'int8', decoder_model_merged: 'q4' }
  let t0 = performance.now()
  const processor = await AutoProcessor.from_pretrained(repo, { revision })
  const model = await AutoModelForVision2Seq.from_pretrained(repo, { revision, dtype, device })
  log(`loaded ${repo} on ${device} in ${((performance.now() - t0) / 1000).toFixed(1)} s`)
  for (const file of e.target.files) {
    t0 = performance.now()
    const text = processor.apply_chat_template([{ role: 'user', content: [{ type: 'image' }, { type: 'text', text: PROMPT }] }], { add_generation_prompt: true })
    const inputs = await processor(text, [await RawImage.fromBlob(file)], { do_image_splitting: false })
    const out = await model.generate({ ...inputs, max_new_tokens: 160, do_sample: false, repetition_penalty: 1.1 })
    const [reply] = processor.batch_decode(out.slice(null, [inputs.input_ids.dims.at(-1), null]), { skip_special_tokens: true })
    log(`--- ${file.name} · ${((performance.now() - t0) / 1000).toFixed(1)} s\n${reply.trim()}`)
  }
  const keys = (await (await caches.open('transformers-cache')).keys()).map(r => r.url)
  log('cache keys:\n' + keys.filter(k => k.includes(repo)).join('\n'))
  log('DONE')
}
