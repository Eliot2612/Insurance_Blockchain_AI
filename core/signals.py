from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from core.models import Claim, ClaimImage, ClaimStatus, Property, ClaimReview
from ML.Damage_Assessment import calculate_damage_assessment, create_retraining_dataset, train_model
from ML.weather_detection_model import get_extreme_weather
from Equations.disaster_risk import get_coordinates_from_postcode
import threading
from datetime import datetime, timedelta
from shamir_mnemonic import generate_mnemonics
from collections import Counter



def start_review(claim_id,decision):

    if decision == 0:
        decision = "LITTLE_OR_NONE"
    elif decision == 1:
        decision = "MILD"
    else:
        decision = "SEVERE"

    print("LOOK AT ME I AM THE CAPTIN NOW",decision)


    decision = decision.zfill(16)
    decision = decision.encode('utf-8')

    total_shares = 5
    threshold = 3

    mnemonics = generate_mnemonics(
        master_secret=decision,
        group_threshold=1,
        groups=[[threshold, total_shares]],  # 3 shares required out of 5
    )


    for innerlist in mnemonics:
        i = 0
        for share in innerlist:
            i = i+1
            print(share,i)
            review = ClaimReview.objects.create(
                share= share,
                claim_id = claim_id,
                employee_id = i,
            )
            print(review)


def process_claims():
    """
    Process all claims with status OPEN in a separate thread.
    """
    try:
        print("Starting background claim processing...")

        # Get the CoreConfig dynamically
        core_config = apps.get_app_config('core')
        model = core_config.loaded_model
        if model is None:
            raise ValueError("Model is not loaded properly in CoreConfig!")

        # Fetch all "OPEN" claims
        open_claims = Claim.objects.filter(status=ClaimStatus.OPEN)
        print(f"Found {open_claims.count()} claim(s) with status OPEN.")

        for claim in open_claims:
            if claim.status != ClaimStatus.OPEN:
                continue
            print(f"Processing Claim ID {claim.claim_id}...")

            claim_images = claim.claim_images.all()
            if not claim_images.exists():
                print(f"No images found for Claim ID {claim.claim_id}. Skipping...")
                continue

            first_image = claim_images.first()
            print(f"Using image {first_image.image_file.name} for prediction for Claim ID {claim.claim_id}.")

            if claim.status != ClaimStatus.OPEN and claim.manuel_review:
                core_config.training_data.append([first_image.image_file.path, claim.ml_score])

                counts = Counter(label for _, label in core_config.training_data)
                if all(counts[label] > 100 for label in [0, 1, 2]):
                    # Run training on another thread
                    train_thread = threading.Thread(
                        target=train_model,
                        args=(create_retraining_dataset(core_config.training_data),),
                        daemon=True
                    )
                    train_thread.start()

            weather_score = 1 # Assume the worst
            user_property = Property.objects.filter(user=claim.user).first()

            lat,lon,x = get_coordinates_from_postcode(user_property.postcode, user_property.country)
            weather_score = get_extreme_weather(lat, lon, timeframe_in_days=21, percent_to_consider_extreme=50)
            print(f"Weather score: {weather_score}")
            if weather_score < 0.1:
                claim.manuel_review = True
                claim.save(update_fields=['manuel_review'])
                start_review(claim.id, 0)
                continue
            ml_score = calculate_damage_assessment(first_image.image_file.path, model=model)
            print(f"Predicted ML Score for Claim ID {claim.claim_id}: {ml_score[0]}")

            claim.ml_score = int(ml_score[0])
            if int(ml_score[0]) != 0:
                claim.status = "APPROVED"
            else:
                claim.manuel_review = True
            claim.save(update_fields=['ml_score', 'status', 'manuel_review'])
            print(f"Updated Claim ID {claim.claim_id} with ML Score: {claim.ml_score} and Status: {claim.status}")

            start_review(claim.claim_id,int(ml_score[0]))

    except Exception as e:
        print(f"Error processing claims: {e}")


@receiver(post_save, sender=ClaimImage)
def trigger_background_claim_processing(sender, instance, created, **kwargs):
    """
    Signal to trigger claim processing in a separate thread when a ClaimImage is saved.
    """
    if created:
        print(f"New ClaimImage was created: {instance.id}, starting background processing...")
        core_config = apps.get_app_config('core')
        if datetime.now() > core_config.last_processed_time + timedelta(minutes=5):
            # Run claim processing in a separate thread
            thread = threading.Thread(target=process_claims, daemon=True)
            thread.start()
        else:
            print(f"Claims are processed every 5 minutes, only {datetime.now() - core_config.last_processed_time} has passed.")
