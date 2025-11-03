import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense
import numpy as np
import os
import pandas as pd
from tensorflow.keras.models import load_model
from PIL import Image
import matplotlib.pyplot as plt

# Download and extract the dataset
def download_and_extract_dataset(url, cache_dir='dataset'):
    extracted_path = tf.keras.utils.get_file("MEDIC.tar.gz", url, extract=True, cache_dir=cache_dir)
    return extracted_path

# Read the dataset files
def read_dataset_files(extracted_path):
    train_file = os.path.join(extracted_path, 'MEDIC_train.tsv')
    dev_file = os.path.join(extracted_path, 'MEDIC_dev.tsv')
    test_file = os.path.join(extracted_path, 'MEDIC_test.tsv')
    train_df = pd.read_csv(train_file, sep='\t')
    dev_df = pd.read_csv(dev_file, sep='\t')
    test_df = pd.read_csv(test_file, sep='\t')

    return train_df, dev_df, test_df

# Process dataframes and extract image paths and labels
def process_dataframe(df, extracted_path):
    image_paths = df["image_path"].apply(lambda x: os.path.join(extracted_path, x))
    labels = df["damage_severity"]
    return image_paths, labels

# Map labels to categorical indices
def map_labels_to_indices(labels):
    label_mapping = {'little_or_none': 0, 'mild': 1, 'severe': 2}
    return labels.map(label_mapping)

# Decode images
def decode_image(image_path, label):
    try:
        img = tf.keras.utils.load_img(image_path, target_size=(224, 224))
        img = img.convert("RGB")
        img = tf.keras.utils.img_to_array(img)
        img = tf.cast(img, tf.float32)
        label = tf.cast(label, tf.float32)
        return img, label
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        return tf.zeros((224, 224, 3), dtype=tf.float32), tf.constant(-1.0, dtype=tf.float32)

# Wrapper function for TensorFlow dataset mapping
def decode_image_wrapper(image_path, label):
    img, label = tf.numpy_function(decode_image, [image_path, label], [tf.float32, tf.float32])
    img.set_shape((224, 224, 3))
    label.set_shape(())
    return img, label

# Filter out invalid images
def filter_valid_images(image, label):
    return tf.not_equal(label, -1.0)

# Create TensorFlow datasets
def create_tf_dataset(image_paths, labels, batch_size=32, shuffle=True):
    label_to_index = {label: index for index, label in enumerate(set(labels))}
    labels = [label_to_index[label] for label in labels]

    image_paths_ds = tf.data.Dataset.from_tensor_slices(image_paths)
    labels_ds = tf.data.Dataset.from_tensor_slices(labels)
    dataset = tf.data.Dataset.zip((image_paths_ds, labels_ds))

    dataset = dataset.map(decode_image_wrapper, num_parallel_calls=tf.data.AUTOTUNE)
    dataset = dataset.filter(filter_valid_images)

    if shuffle:
        dataset = dataset.shuffle(buffer_size=1000)

    dataset = dataset.batch(batch_size).prefetch(buffer_size=tf.data.AUTOTUNE)
    return dataset

# Define CBAM layer
@tf.keras.utils.register_keras_serializable("CBAM")
class CBAM(tf.keras.layers.Layer):
    def __init__(self, reduction_ratio=16, **kwargs):
        super(CBAM, self).__init__(**kwargs)
        self.reduction_ratio = reduction_ratio

    def build(self, input_shape):
        channel_dim = input_shape[-1]
        self.avg_pool = tf.keras.layers.GlobalAveragePooling2D()
        self.max_pool = tf.keras.layers.GlobalMaxPooling2D()
        self.fc1 = tf.keras.layers.Dense(channel_dim // self.reduction_ratio, activation="relu")
        self.fc2 = tf.keras.layers.Dense(channel_dim, activation="sigmoid")
        self.conv = tf.keras.layers.Conv2D(1, kernel_size=7, padding="same", activation="sigmoid")
        super(CBAM, self).build(input_shape)

    def call(self, inputs):
        avg_pool = self.avg_pool(inputs)
        max_pool = self.max_pool(inputs)

        avg_out = self.fc2(self.fc1(avg_pool))
        max_out = self.fc2(self.fc1(max_pool))

        avg_out = tf.reshape(avg_out, [-1, 1, 1, inputs.shape[-1]])
        max_out = tf.reshape(max_out, [-1, 1, 1, inputs.shape[-1]])

        channel_attention = inputs * (avg_out + max_out)
        spatial_attention = self.conv(channel_attention)
        output = channel_attention * spatial_attention

        return output

# Build the model with fine-tuning
def build_model(num_classes, img_height=224, img_width=224, trainable=False):
    convnext_xl = tf.keras.applications.ConvNeXtXLarge(
        include_top=False,
        input_shape=(img_height, img_width, 3),
        weights="imagenet"
    )
    convnext_xl.trainable = trainable
    inputs = layers.Input(shape=(img_height, img_width, 3))
    x = convnext_xl(inputs)

    x = CBAM()(x)
    x = GlobalAveragePooling2D()(x)
    x = Dense(1024, activation="relu", kernel_initializer='he_normal')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.5)(x)

    x = Dense(512, activation="relu", kernel_initializer='he_normal')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.3)(x)

    output = Dense(num_classes, activation="softmax", kernel_initializer='glorot_normal')(x)
    model = models.Model(inputs=inputs, outputs=output)
    return model

# Train the model
def train_model(train_dataset, valid_dataset=None, epochs=10, class_num=3):
    num_classes = class_num
    model = build_model(num_classes, trainable=False)
    model.summary()

    lr_schedule = tf.keras.optimizers.schedules.CosineDecayRestarts(
        initial_learning_rate=1e-3, first_decay_steps=5000, t_mul=2)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr_schedule),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    true_labels = np.concatenate([y for x, y in train_dataset], axis=0)
    steps_per_epoch = len(true_labels) // 32
    if valid_dataset is not None:
        history = model.fit(
            train_dataset,
            validation_data=valid_dataset,
            epochs=epochs,
            steps_per_epoch=steps_per_epoch
        )
    else:
        history = model.fit(
            train_dataset,
            epochs=epochs,
            steps_per_epoch=steps_per_epoch
        )
    save_model(model, "models/damageassessment.keras")
    return model, history

# Load the model
def load_trained_model(model_path):
    return load_model(model_path, custom_objects={"CBAM": CBAM})

# Evaluate and display results
def evaluate_and_display_results(model, test_dataset, test_image_paths):
    test_loss, test_accuracy = model.evaluate(test_dataset)

    predictions = model.predict(test_dataset)
    predicted_labels = np.argmax(predictions, axis=1)

    true_labels = np.concatenate([y for x, y in test_dataset], axis=0)

    results_df = pd.DataFrame({'true_label': true_labels, 'predicted_label': predicted_labels, 'image_path': test_image_paths})

    correct_predictions_df = results_df[results_df['true_label'] == results_df['predicted_label']]
    incorrect_predictions_df = results_df[results_df['true_label'] != results_df['predicted_label']]

    return correct_predictions_df, incorrect_predictions_df


# Display image samples
def display_samples(df, title, num_samples=5):
    label_mapping = {'little_or_none': 0, 'mild': 1, 'severe': 2}
    fig, axes = plt.subplots(num_samples, 1, figsize=(10, num_samples * 5))
    fig.suptitle(title, fontsize=16)

    for i in range(num_samples):
        sample = df.sample(1)
        image_path = sample['image_path'].values[0]
        true_label = sample['true_label'].values[0]
        predicted_label = sample['predicted_label'].values[0]

        img = plt.imread(image_path)
        axes[i].imshow(img)
        axes[i].set_title(f"True: {list(label_mapping.keys())[list(label_mapping.values()).index(true_label)]}, Predicted: {list(label_mapping.keys())[list(label_mapping.values()).index(predicted_label)]}")
        axes[i].axis('off')

    plt.show()

# Create the dataframes in correct format
def create_dataframes():
    url = "https://crisisnlp.qcri.org/data/medic/MEDIC.tar.gz"
    extracted_path = download_and_extract_dataset(url)
    train_df, dev_df, test_df = read_dataset_files(extracted_path)

    train_image_paths, train_labels = process_dataframe(train_df, extracted_path)
    valid_image_paths, valid_labels = process_dataframe(dev_df, extracted_path)
    test_image_paths, test_labels = process_dataframe(test_df, extracted_path)

    train_labels = map_labels_to_indices(train_labels)
    valid_labels = map_labels_to_indices(valid_labels)
    test_labels = map_labels_to_indices(test_labels)

    train_dataset = create_tf_dataset(train_image_paths, train_labels)
    valid_dataset = create_tf_dataset(valid_image_paths, valid_labels, shuffle=False)
    test_dataset = create_tf_dataset(test_image_paths, test_labels, shuffle=False)

    return train_dataset, valid_dataset, test_dataset, train_image_paths, valid_image_paths, test_image_paths

# Evaluate model performance
def evaluate_model(model, test_dataset, test_image_paths):
    correct_predictions_df, incorrect_predictions_df = evaluate_and_display_results(model, test_dataset, test_image_paths)

    display_samples(correct_predictions_df, "Correct Predictions")
    display_samples(incorrect_predictions_df, "Incorrect Predictions")

# Save trained model
def save_model(model, path):
    model.save(path, overwrite=True)

# Decode test images
def decode_test_image(image_path):
    try:
        # Load image and resize it to target size
        img = tf.keras.utils.load_img(image_path, target_size=(224, 224))
        # Convert to RGB
        img = img.convert("RGB")

        # Convert image to array format
        img = tf.keras.utils.img_to_array(img)
        # Cast values to float32
        img = tf.cast(img, tf.float32)
        # Add batch dimension
        img = tf.expand_dims(img, axis=0)
        return img
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        # Return a placeholder tensor
        return tf.zeros((1, 224, 224, 3), dtype=tf.float32)

def calculate_damage_assessment(image_path, model):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    media_file = os.path.join(base_dir, 'media')
    user_file = os.path.join(media_file, image_path)
    if model is None:
        model = load_trained_model("models/damageassessment.keras")
    image = decode_test_image(user_file)
    return np.argmax(model.predict(image), axis=1)

def create_retraining_dataset(data):
    current_script_path = os.path.dirname(__file__)
    media_dir = os.path.join(current_script_path, "../media",)
    # Extract file paths and numerical labels
    file_paths = [os.path.join(media_dir, item[0]) for item in data]
    numerical_labels = [item[1] for item in data]
    # Create the TensorFlow dataset
    batch_size = 32
    train_dataset = create_tf_dataset(file_paths, numerical_labels, batch_size=batch_size, shuffle=True)

    # Inspect the dataset
    for batch in train_dataset.take(1):
        images, labels = batch
        print("Image batch shape:", images.shape)
        print("Label batch:", labels.numpy())

    return train_dataset


# Main function
def main():
    #train_dataset, valid_dataset, test_dataset, train_image_paths, valid_image_paths, test_image_paths  = create_dataframes()
    #model, history = train_model(train_dataset, valid_dataset, epochs=50)
    #save_model(model, "models/damageassessment.keras")
    model = load_trained_model("models/damageassessment.keras")
    #evaluate_model(model, test_dataset, test_image_paths)
