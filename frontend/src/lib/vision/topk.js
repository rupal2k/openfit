// Classifier logits → [{ label, score }] for the k most likely labels (stable softmax).
export function topK(logits, id2label, k = 3) {
  const xs = Array.from(logits)
  const max = Math.max(...xs)
  const exps = xs.map(x => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e, i) => ({ label: id2label[i], score: e / sum }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
