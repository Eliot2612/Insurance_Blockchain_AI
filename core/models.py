import secrets
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator



class PolicyStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    EXPIRED = "EXPIRED", "Expired"
    CANCELLED = "CANCELLED", "Cancelled"
    PENDING = "PENDING", "Pending"


class ClaimStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    PAID_OUT = "PAID_OUT", "Paid Out"

class Role(models.TextChoices):
    USER = "USER", "User"
    REVIEWER = "REVIEWER", "Reviewer"
    ADMIN = "ADMIN", "Admin"

class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    wallet_address = models.CharField(max_length=42, blank=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER
    )


    policy_id = models.CharField(max_length=66, blank=True, null=True)
    policy_status = models.CharField(
        max_length=20,
        choices=PolicyStatus.choices,
        default=PolicyStatus.PENDING
    )

    token = models.CharField(max_length=64, blank=True, null=True)

    def generate_token(self):
        self.token = secrets.token_hex(32)
        self.save()

    def __str__(self):
        return f"{self.name} ({self.email})"


class Property(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='property')
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    house_type = models.CharField(max_length=50, blank=True)
    occupants = models.PositiveIntegerField(default=1)
    house_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=5, default='£', blank=True)
    ownership_proof = models.FileField(upload_to='property_docs/', null=True, blank=True)
    insurance_proof = models.FileField(upload_to='property_docs/', null=True, blank=True)
    riskLevel =  models.FloatField(default=1.0)
    ethHouseValue = models.BigIntegerField(null=True, blank=True)
    premium = models.DecimalField(max_digits=20,decimal_places=18,null=True, blank=True)

    def __str__(self):
        return f"Property for {self.user.email}"



class Employee(models.Model):
    name = models.CharField(default="rev", max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.REVIEWER
    )
    token = models.CharField(max_length=64, blank=True, null=True)

    def generate_token(self):
        self.token = secrets.token_hex(32)
        self.save()
    def __str__(self):
        return self.email


class Admin(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)

    def __str__(self):
        return self.email


class Claim(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='claims')
    disaster_type = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    policy_id = models.CharField(max_length=66, blank=True)
    claim_id = models.BigIntegerField()
    ml_score = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)], default=0
    )
    manuel_review = models.BooleanField(default=False)
    date_submitted = models.DateTimeField(default=timezone.now)
    estimated_payout = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    final_payout = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    manuel_review_decistion = models.CharField(max_length=50, blank=True)

    status = models.CharField(
        max_length=20,
        choices=ClaimStatus.choices,
        default=ClaimStatus.OPEN
    )
    def __str__(self):
        return f"Claim {self.claim_id} ({self.disaster_type}) - User: {self.user.email}"


class ClaimImage(models.Model):
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='claim_images')
    image_file = models.ImageField(upload_to='claims/')
    digital_signature = models.CharField(max_length=256, blank=True, null=True)

    def __str__(self):
        return f"Image {self.id} for Claim {self.claim.claim_id}"

class ReviewDecision(models.Model):
    """
    Stores predefined review decision levels.
    """
    LEVELS = [
        ("LITTLE_NONE", "Little/None"),
        ("MIDDLE", "Middle"),
        ("SEVERE", "Severe"),
    ]

    decision_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=20, choices=LEVELS, unique=True)

    def __str__(self):
        return self.get_name_display()


class ClaimReview(models.Model):
    claim = models.ForeignKey("Claim", on_delete=models.CASCADE, related_name="reviews")
    employee = models.ForeignKey("Employee", on_delete=models.CASCADE, related_name="reviews")
    share = models.TextField()

    INTENSITY_CHOICES = [
        ('LITTLE_OR_NONE', 'Little or None'),
        ('MILD', 'Mild'),
        ('SEVERE', 'Severe'),
    ]

    intensity = models.CharField(
        max_length=20,
        choices=INTENSITY_CHOICES,
        blank=True,
        null=True
    )

    def __str__(self):
        return f"Review by {self.employee.email} for Claim {self.claim.claim_id}"
