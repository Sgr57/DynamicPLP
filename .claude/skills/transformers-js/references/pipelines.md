# Pipeline Tasks Reference

Complete catalog of Transformers.js pipeline tasks with input/output formats and recommended models.

## Table of Contents

- [NLP Tasks](#nlp-tasks)
- [Vision Tasks](#vision-tasks)
- [Audio Tasks](#audio-tasks)
- [Multimodal Tasks](#multimodal-tasks)
- [Custom Pipeline Options](#custom-pipeline-options)

---

## NLP Tasks

### text-classification / sentiment-analysis

```javascript
const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
const result = await classifier('I love this!');
// [{ label: 'POSITIVE', score: 0.9998 }]

// Multiple inputs
const results = await classifier(['Great product', 'Terrible experience']);
// [{ label: 'POSITIVE', score: 0.999 }, { label: 'NEGATIVE', score: 0.998 }]

// Top-k labels
const all = await classifier('Not bad', { topk: null });
// [{ label: 'POSITIVE', score: 0.65 }, { label: 'NEGATIVE', score: 0.35 }]
```

**Input**: `string | string[]` — **Output**: `{ label: string, score: number }[]`

### token-classification (NER)

```javascript
const ner = await pipeline('token-classification', 'Xenova/bert-base-NER');
const entities = await ner('My name is Sarah and I live in London');
// [{ word: 'Sarah', entity: 'B-PER', score: 0.998, start: 11, end: 16 },
//  { word: 'London', entity: 'B-LOC', score: 0.997, start: 31, end: 37 }]
```

**Input**: `string` — **Output**: `{ word, entity, score, index, start, end }[]`
**Options**: `{ ignore_labels: ['O'] }` to filter out non-entity tokens.

### question-answering

```javascript
const qa = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad');
const answer = await qa({
  question: 'What is the capital of France?',
  context: 'France is a country in Europe. Its capital is Paris.',
});
// { answer: 'Paris', score: 0.998, start: 45, end: 50 }
```

**Input**: `{ question: string, context: string }` — **Output**: `{ answer, score, start, end }`
**Options**: `{ topk: 3 }` to get multiple answer candidates.

### summarization

```javascript
const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
const summary = await summarizer('Long article text here...', {
  max_length: 100,
  min_length: 30,
});
// [{ summary_text: 'Condensed version...' }]
```

**Input**: `string` — **Output**: `{ summary_text: string }[]`
**Options**: `max_length`, `min_length`, `num_beams`, `length_penalty`.

### translation

```javascript
const translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M');
const result = await translator('Hello, how are you?', {
  src_lang: 'eng_Latn',
  tgt_lang: 'fra_Latn',
});
// [{ translation_text: 'Bonjour, comment allez-vous ?' }]
```

**Input**: `string | string[]` — **Output**: `{ translation_text: string }[]`
**Options**: `src_lang`, `tgt_lang`, `max_length`.

For task-specific translation models (e.g., `translation_en_to_de`):

```javascript
const translator = await pipeline('translation_en_to_de', 'Xenova/t5-small');
```

### text-generation

```javascript
const generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
  dtype: 'q4', device: 'webgpu',
});

// Chat-style with messages
const output = await generator([
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'What is 2+2?' },
], { max_new_tokens: 128 });
console.log(output[0].generated_text.at(-1).content);

// Raw text completion
const output2 = await generator('Once upon a time', { max_new_tokens: 50 });
console.log(output2[0].generated_text);
```

**Input**: `string | Message[]` — **Output**: `{ generated_text: string | Message[] }[]`
**Options**: `max_new_tokens`, `temperature`, `top_p`, `top_k`, `do_sample`, `repetition_penalty`, `streamer`.

### text2text-generation

```javascript
const generator = await pipeline('text2text-generation', 'Xenova/flan-t5-small');
const result = await generator('Translate to German: Hello world');
// [{ generated_text: 'Hallo Welt' }]
```

**Input**: `string` — **Output**: `{ generated_text: string }[]`

### fill-mask

```javascript
const filler = await pipeline('fill-mask', 'Xenova/bert-base-uncased');
const result = await filler('Paris is the [MASK] of France.');
// [{ token_str: 'capital', score: 0.98, sequence: 'paris is the capital of france.' }, ...]
```

**Input**: `string` (must contain `[MASK]` token) — **Output**: `{ token_str, score, sequence }[]`
**Options**: `{ topk: 5 }` for number of candidates.

### zero-shot-classification

```javascript
const classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
const result = await classifier('I love programming in JavaScript', {
  candidate_labels: ['technology', 'sports', 'cooking'],
});
// { labels: ['technology', 'cooking', 'sports'], scores: [0.95, 0.03, 0.02] }
```

**Input**: `string` — **Output**: `{ sequence, labels: string[], scores: number[] }`
**Options**: `candidate_labels` (required), `multi_label: true` for independent scoring.

### feature-extraction (Embeddings)

```javascript
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const embeddings = await extractor('Hello world', { pooling: 'mean', normalize: true });
// Tensor { dims: [1, 384], data: Float32Array }
console.log(embeddings.tolist()); // [[0.012, -0.034, ...]]
```

**Input**: `string | string[]` — **Output**: `Tensor`
**Options**: `{ pooling: 'mean' | 'cls', normalize: true }` for sentence embeddings.

---

## Vision Tasks

### image-classification

```javascript
const classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
const result = await classifier('https://example.com/cat.jpg');
// [{ label: 'tabby cat', score: 0.85 }]

// Top-k results
const all = await classifier(imageUrl, { topk: 5 });
```

**Input**: `string (URL) | RawImage | HTMLImageElement` — **Output**: `{ label, score }[]`

### object-detection

```javascript
const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
const result = await detector('https://example.com/room.jpg');
// [{ label: 'chair', score: 0.98, box: { xmin, ymin, xmax, ymax } }, ...]
```

**Input**: `string (URL) | RawImage` — **Output**: `{ label, score, box }[]`
**Options**: `{ threshold: 0.9 }` for detection confidence.

### image-segmentation

```javascript
const segmenter = await pipeline('image-segmentation', 'Xenova/detr-resnet-50-panoptic');
const result = await segmenter(imageUrl);
// [{ label: 'cat', score: 0.99, mask: RawImage }, ...]
```

**Input**: `string (URL) | RawImage` — **Output**: `{ label, score, mask: RawImage }[]`

### depth-estimation

```javascript
const estimator = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
const result = await estimator(imageUrl);
// { depth: RawImage, predicted_depth: Tensor }
```

**Input**: `string (URL) | RawImage` — **Output**: `{ depth: RawImage, predicted_depth: Tensor }`

### background-removal

```javascript
const remover = await pipeline('background-removal', 'briaai/RMBG-1.4');
const result = await remover(imageUrl);
// RawImage (RGBA with transparent background)
```

**Input**: `string (URL) | RawImage` — **Output**: `RawImage`

---

## Audio Tasks

### automatic-speech-recognition

```javascript
const transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en');
const result = await transcriber('https://example.com/audio.mp3');
// { text: 'Hello, how are you today?' }

// With timestamps
const result2 = await transcriber(audioUrl, { return_timestamps: true });
// { text: '...', chunks: [{ text: 'Hello', timestamp: [0.0, 0.5] }, ...] }

// Long audio with chunking
const result3 = await transcriber(longAudio, { chunk_length_s: 30, stride_length_s: 5 });
```

**Input**: `string (URL) | Float32Array | Blob` — **Output**: `{ text: string, chunks?: [] }`
**Options**: `return_timestamps`, `chunk_length_s`, `stride_length_s`, `language`, `task` ('transcribe' | 'translate').

### audio-classification

```javascript
const classifier = await pipeline('audio-classification', 'Xenova/wav2vec2-large-xlsr-53-gender-recognition-librispeech');
const result = await classifier(audioUrl);
// [{ label: 'female', score: 0.95 }]
```

**Input**: `string (URL) | Float32Array` — **Output**: `{ label, score }[]`

### text-to-speech

```javascript
const synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts');
const result = await synthesizer('Hello, my name is Claude.');
// { audio: Float32Array, sampling_rate: 16000 }
```

**Input**: `string` — **Output**: `{ audio: Float32Array, sampling_rate: number }`

---

## Multimodal Tasks

### image-to-text

```javascript
const captioner = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning');
const result = await captioner(imageUrl);
// [{ generated_text: 'a cat sitting on a couch' }]
```

**Input**: `string (URL) | RawImage` — **Output**: `{ generated_text: string }[]`

### document-question-answering

```javascript
const docQa = await pipeline('document-question-answering', 'Xenova/donut-base-finetuned-docvqa');
const result = await docQa(documentImageUrl, 'What is the total amount?');
// [{ answer: '$150.00' }]
```

**Input**: `(image, question: string)` — **Output**: `{ answer: string }[]`

### zero-shot-image-classification

```javascript
const classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
const result = await classifier(imageUrl, {
  candidate_labels: ['cat', 'dog', 'bird'],
});
// [{ label: 'cat', score: 0.95 }, ...]
```

**Input**: `string (URL) | RawImage` — **Output**: `{ label, score }[]`
**Options**: `candidate_labels` (required).

### zero-shot-object-detection

```javascript
const detector = await pipeline('zero-shot-object-detection', 'Xenova/owlvit-base-patch32');
const result = await detector(imageUrl, {
  candidate_labels: ['cat', 'remote control'],
});
// [{ label: 'cat', score: 0.92, box: { xmin, ymin, xmax, ymax } }, ...]
```

**Input**: `string (URL) | RawImage` — **Output**: `{ label, score, box }[]`
**Options**: `candidate_labels` (required), `threshold`.

---

## Custom Pipeline Options

### Batch processing

Pass arrays for better throughput:

```javascript
const classifier = await pipeline('sentiment-analysis');
const results = await classifier(['Text 1', 'Text 2', 'Text 3']);
```

### Reusing pipelines for multiple inputs

```javascript
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

// Compute similarity between two texts
const emb1 = await pipe('First text', { pooling: 'mean', normalize: true });
const emb2 = await pipe('Second text', { pooling: 'mean', normalize: true });

// Cosine similarity (already normalized, so dot product suffices)
const similarity = emb1.data.reduce((sum, v, i) => sum + v * emb2.data[i], 0);
```
