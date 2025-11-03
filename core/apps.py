from django.apps import AppConfig
import os
from ML.Damage_Assessment import load_trained_model
from datetime import datetime
class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    loaded_model = None
    training_data = []
    last_processed_time = None
    def ready(self):
        import core.signals  # Ensure signals are registered
        try:
            # Define model path
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, 'ML/models/damageassessment.keras')

            # Load model
            CoreConfig.loaded_model = load_trained_model(model_path)

            # Debugging prints
            if CoreConfig.loaded_model:
                CoreConfig.last_processed_time = datetime.now()
                print("Model loaded successfully in CoreConfig!")
            else:
                print(" Failed to load model in CoreConfig!")

        except Exception as e:
            print(f"Error loading ML model in CoreConfig: {e}")
