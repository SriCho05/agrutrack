import argparse
import numpy as np
from PIL import Image
import tensorflow as tf

TFLITE_MODEL = 'soil_classifier_mobilenet_int8.tflite'
IMG_SIZE = (128, 128)


def load_labels_from_generator(dataset_dir):
    # Build a small generator to get class ordering used during training
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    datagen = ImageDataGenerator(rescale=1.0/255)
    gen = datagen.flow_from_directory(dataset_dir, target_size=IMG_SIZE, batch_size=1, class_mode=None, shuffle=False)
    return {v: k for k, v in gen.class_indices.items()}


def preprocess_image(path, img_size=IMG_SIZE):
    img = Image.open(path).convert('RGB')
    img = img.resize(img_size, Image.BILINEAR)
    arr = np.asarray(img).astype(np.float32) / 255.0
    return arr


def predict_tflite(image_path, model_path=TFLITE_MODEL, labels=None):
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    img = preprocess_image(image_path)
    inp = np.expand_dims(img.astype(np.float32), axis=0)

    # Handle quantized input
    if input_details[0]['dtype'] == np.int8 or input_details[0]['dtype'] == np.uint8:
        scale, zero_point = input_details[0]['quantization']
        if scale == 0:
            q_inp = inp.astype(input_details[0]['dtype'])
        else:
            q_inp = (inp / scale + zero_point).astype(input_details[0]['dtype'])
        interpreter.set_tensor(input_details[0]['index'], q_inp)
    else:
        interpreter.set_tensor(input_details[0]['index'], inp)

    interpreter.invoke()
    out = interpreter.get_tensor(output_details[0]['index'])

    # Dequantize output logits if needed
    if output_details[0]['dtype'] == np.int8 or output_details[0]['dtype'] == np.uint8:
        scale_o, zero_o = output_details[0]['quantization']
        out = (out.astype(np.float32) - zero_o) * scale_o

    scores = tf.nn.softmax(out[0]).numpy()
    top_idx = int(np.argmax(scores))
    top_score = float(scores[top_idx])

    label = labels.get(top_idx, str(top_idx)) if labels else str(top_idx)
    return label, top_score, scores


def main():
    p = argparse.ArgumentParser(description='Run TFLite inference on an image (Raspberry Pi friendly)')
    p.add_argument('image', help='Path to input image')
    p.add_argument('--model', default=TFLITE_MODEL, help='Path to .tflite model')
    p.add_argument('--dataset', default=None, help='(optional) path to dataset to recover label ordering')
    args = p.parse_args()

    labels = None
    if args.dataset:
        try:
            labels = load_labels_from_generator(args.dataset)
        except Exception:
            labels = None

    label, score, _ = predict_tflite(args.image, model_path=args.model, labels=labels)
    print(f'Predicted: {label} ({score:.3f})')


if __name__ == '__main__':
    main()
