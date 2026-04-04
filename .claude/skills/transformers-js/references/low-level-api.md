# Low-Level API Reference

Use the low-level API when `pipeline()` is insufficient: custom preprocessing, multi-model composition, direct tensor access, or chat template control.

## Table of Contents

- [AutoTokenizer](#autotokenizer)
- [AutoProcessor](#autoprocessor)
- [RawImage](#rawimage)
- [AutoModel / Task-Specific Models](#automodel)
- [Manual Inference Flow](#manual-inference-flow)
- [Tensor Operations](#tensor-operations)
- [ModelRegistry](#modelregistry)

---

## AutoTokenizer

```javascript
import { AutoTokenizer } from '@huggingface/transformers';

const tokenizer = await AutoTokenizer.from_pretrained('onnx-community/Qwen2.5-0.5B-Instruct');
```

### Encode / Decode

```javascript
// Encode text to token IDs
const { input_ids, attention_mask } = tokenizer('Hello world');
console.log(input_ids.tolist()); // [[101, 7592, 2088, 102]]

// Decode token IDs back to text
const text = tokenizer.decode(input_ids.data, { skip_special_tokens: true });
// 'Hello world'

// Batch decode
const texts = tokenizer.batch_decode(generated_ids, { skip_special_tokens: true });
```

### Chat Template

Apply the model's chat template to format messages:

```javascript
const messages = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'What is 2+2?' },
];

const prompt = tokenizer.apply_chat_template(messages, {
  tokenize: false,       // Return string, not token IDs
  add_generation_prompt: true, // Add assistant turn prefix
});

// Or tokenize directly
const inputs = tokenizer.apply_chat_template(messages, {
  tokenize: true,
  add_generation_prompt: true,
  return_dict: true,     // Returns { input_ids, attention_mask }
});
```

---

## AutoProcessor

For vision and multimodal models that need image preprocessing:

```javascript
import { AutoProcessor } from '@huggingface/transformers';

const processor = await AutoProcessor.from_pretrained('onnx-community/Florence-2-base-ft');

// Process an image
const vision_inputs = await processor(image);
// Returns: { pixel_values: Tensor, ... }
```

### Florence-2 specific

```javascript
const prompts = processor.construct_prompts('<CAPTION>');
const text_inputs = tokenizer(prompts);
```

### Post-processing

```javascript
const result = processor.post_process_generation(generated_text, task, image.size);
```

---

## RawImage

Load and manipulate images for vision pipelines:

```javascript
import { RawImage } from '@huggingface/transformers';

// From URL
const image = await RawImage.fromURL('https://example.com/photo.jpg');

// From Blob (e.g., file input, canvas)
const image = await RawImage.fromBlob(blob);

// Properties
console.log(image.width, image.height, image.channels);

// Resize
const resized = await image.resize(224, 224);

// Convert to tensor
const tensor = image.toTensor();

// Save/display
const blob = await image.toBlob();
```

### From canvas or file input

```javascript
// From <input type="file">
const file = event.target.files[0];
const image = await RawImage.fromBlob(file);

// From canvas
const canvas = document.getElementById('myCanvas');
const blob = await new Promise(resolve => canvas.toBlob(resolve));
const image = await RawImage.fromBlob(blob);
```

---

## AutoModel

### Generic auto-loading

```javascript
import { AutoModel } from '@huggingface/transformers';

const model = await AutoModel.from_pretrained('model-id', {
  device: 'webgpu',
  dtype: 'q4',
});
```

### Task-specific model classes

```javascript
import {
  AutoModelForCausalLM,
  AutoModelForSeq2SeqLM,
  AutoModelForSequenceClassification,
  AutoModelForTokenClassification,
  AutoModelForQuestionAnswering,
  // Vision
  AutoModelForImageClassification,
  AutoModelForObjectDetection,
  // Multimodal
  Florence2ForConditionalGeneration,
  Gemma4ForConditionalGeneration,
} from '@huggingface/transformers';

const model = await AutoModelForCausalLM.from_pretrained(
  'onnx-community/Qwen2.5-0.5B-Instruct',
  { dtype: 'q4', device: 'webgpu' },
);
```

### Per-module dtype (encoder-decoder models)

Critical for models with multiple submodules (Whisper, Florence-2, T5):

```javascript
const model = await Florence2ForConditionalGeneration.from_pretrained(
  'onnx-community/Florence-2-base-ft',
  {
    dtype: {
      embed_tokens: 'fp16',
      vision_encoder: 'fp16',
      encoder_model: 'q4',
      decoder_model_merged: 'q4',
    },
    device: 'webgpu',
  },
);
```

---

## Manual Inference Flow

### Text generation (causal LM)

```javascript
import { AutoTokenizer, AutoModelForCausalLM, TextStreamer } from '@huggingface/transformers';

// 1. Load tokenizer and model
const tokenizer = await AutoTokenizer.from_pretrained('onnx-community/Qwen2.5-0.5B-Instruct');
const model = await AutoModelForCausalLM.from_pretrained('onnx-community/Qwen2.5-0.5B-Instruct', {
  dtype: 'q4', device: 'webgpu',
});

// 2. Prepare input with chat template
const messages = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Explain gravity in one sentence.' },
];

const inputs = tokenizer.apply_chat_template(messages, {
  tokenize: true,
  add_generation_prompt: true,
  return_dict: true,
});

// 3. Generate with streaming
const streamer = new TextStreamer(tokenizer, {
  skip_prompt: true,
  skip_special_tokens: true,
  callback_function(token) { process.stdout.write(token); },
});

const output = await model.generate({
  ...inputs,
  max_new_tokens: 128,
  temperature: 0.7,
  top_p: 0.9,
  do_sample: true,
  streamer,
});

// 4. Decode full output
const response = tokenizer.decode(output[0], { skip_special_tokens: true });
```

### Multimodal (Florence-2)

```javascript
import {
  Florence2ForConditionalGeneration,
  AutoProcessor,
  AutoTokenizer,
  RawImage,
} from '@huggingface/transformers';

const model_id = 'onnx-community/Florence-2-base-ft';
const model = await Florence2ForConditionalGeneration.from_pretrained(model_id, {
  dtype: { embed_tokens: 'fp16', vision_encoder: 'fp16', encoder_model: 'q4', decoder_model_merged: 'q4' },
  device: 'webgpu',
});
const processor = await AutoProcessor.from_pretrained(model_id);
const tokenizer = await AutoTokenizer.from_pretrained(model_id);

const image = await RawImage.fromURL('https://example.com/photo.jpg');
const vision_inputs = await processor(image);

const task = '<CAPTION>';
const prompts = processor.construct_prompts(task);
const text_inputs = tokenizer(prompts);

const generated_ids = await model.generate({
  ...text_inputs,
  ...vision_inputs,
  max_new_tokens: 100,
});

const generated_text = tokenizer.batch_decode(generated_ids, { skip_special_tokens: false })[0];
const result = processor.post_process_generation(generated_text, task, image.size);
```

---

## Tensor Operations

```javascript
// Access raw data
const data = tensor.data;       // Float32Array / BigInt64Array
const shape = tensor.dims;      // e.g., [1, 384]

// Convert to nested array
const array = tensor.tolist();  // [[0.012, -0.034, ...]]

// Slice (for embeddings)
const firstEmbedding = tensor.data.slice(0, 384);
```

---

## ModelRegistry

Discover available quantization options for a model before loading:

```javascript
import { ModelRegistry } from '@huggingface/transformers';

const dtypes = await ModelRegistry.get_available_dtypes('onnx-community/all-MiniLM-L6-v2-ONNX');
console.log(dtypes); // ['fp32', 'fp16', 'int8', 'uint8', 'q8', 'q4']

// Intelligent selection with fallback
const preferred = ['q4', 'q8', 'fp16', 'fp32'];
const dtype = preferred.find(d => dtypes.includes(d)) ?? 'fp32';
```
