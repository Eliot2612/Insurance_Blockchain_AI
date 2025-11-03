# core/views.py

from shamir_mnemonic import combine_mnemonics
from Equations.premium import calculate_premium_wei

import base64
import hashlib
import hmac
import threading
from collections import Counter

from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from Equations.disaster_risk import get_disaster_risk
from Equations.eth_converter import convert_fiat_to_eth
from .models import Claim, User
from .models import Property, ClaimImage, Employee, ClaimReview


@api_view(['POST'])
def register_user(request):
    data = request.data

    required_fields = ['name', 'email', 'password']
    for field in required_fields:
        if field not in data or not data[field].strip():
            return Response(
                {"detail": f"Missing or empty field: {field}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Check unique email
    if User.objects.filter(email=data['email']).exists():
        return Response(
            {"detail": "Email is already in use."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.create(
            name=data['name'].strip(),
            email=data['email'].strip(),
            password=data['password'],
            wallet_address=data.get('wallet_address', '').strip(),
            policy_id=data.get('policy_id', None),
            policy_status=data.get('policy_status', 'ACTIVE')
        )

        # Immediately create an empty property record
        Property.objects.create(user=user)

        return Response(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "message": "User and property record created successfully."
            },
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def login_user(request):
    data = request.data

    required_fields = ['email', 'password']
    for field in required_fields:
        if field not in data or not data[field].strip():
            return Response(
                {"detail": f"Missing or empty field: {field}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    email = data['email'].strip()
    password = data['password'].strip()

    try:
        user = User.objects.filter(email=email).first()

        if user:
            if not password == user.password:
                return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            redirect_url = "/dashboard"

        else:
            user = Employee.objects.filter(email=email).first()
            if not user:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

            if not password == user.password:
                return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

            if user.role == "REVIEWER":
                redirect_url = "/reviewer"
            if user.role == "ADMIN":
                redirect_url = "/admin"

        # Generate a new token after successful login
        user.generate_token()

        # Return the user data along with the newly generated token and redirect URL
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "token": user.token,
                "message": "Login successful.",
                "redirect_url": redirect_url,
                "role": user.role,
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_current_user(request):
    """
    Expects 'Authorization: Bearer <token>' header
    Returns user info if the token is valid
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return Response({"detail": "No or invalid token header."}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split("Bearer ")[1]
    user = User.objects.filter(token=token).first()
    if not user:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "wallet_address": user.wallet_address,
    }
    return Response(data, status=status.HTTP_200_OK)

@api_view(['GET', 'POST'])
def get_or_update_property(request):
    """
    GET -> returns the user's property details
    POST -> updates the user's property details
    """
    # 1. Identify the user from token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return Response({"detail": "No or invalid token header."}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split("Bearer ")[1]
    user = User.objects.filter(token=token).first()
    if not user:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    # 2. Retrieve the property row
    if not hasattr(user, 'property'):
        return Response({"detail": "No property record found."}, status=status.HTTP_404_NOT_FOUND)
    prop = user.property

    # ----------------------------------------
    # GET: Return property details
    # ----------------------------------------
    if request.method == 'GET':
        data = {
            "address": prop.address,
            "city": prop.city,
            "postcode": prop.postcode,
            "country": prop.country,
            "house_type": prop.house_type,
            "occupants": prop.occupants,
            "house_value": str(prop.house_value) if prop.house_value else "",
            "currency": prop.currency,
            "riskLevel": prop.riskLevel,
            "ownership_proof": prop.ownership_proof.url if prop.ownership_proof else None,
            "insurance_proof": prop.insurance_proof.url if prop.insurance_proof else None,
            "ethHouseValue": prop.ethHouseValue,
            "premium": str(prop.premium) if prop.premium else None,
        }
        return Response(data, status=status.HTTP_200_OK)

    # ----------------------------------------
    # POST: Update property details
    # (multipart/form-data if files)
    # ----------------------------------------
    if request.method == 'POST':
        # If your React form is multi-part for files:
        # Parse form data from request.FILES & request.data
        prop.address = request.data.get('address', prop.address)
        prop.city = request.data.get('city', prop.city)
        prop.postcode = request.data.get('postcode', prop.postcode)
        prop.country = request.data.get('country', prop.country)
        prop.house_type = request.data.get('house_type', prop.house_type)
        prop.riskLevel = request.data.get('riskLevel', prop.riskLevel)

        # Convert occupant string to int
        occupant_str = request.data.get('occupants', None)
        if occupant_str is not None:
            try:
                prop.occupants = int(occupant_str)
            except ValueError:
                pass

        # Convert house_value string to decimal
        hv_str = request.data.get('house_value', None)
        if hv_str is not None:
            try:
                prop.house_value = float(hv_str)

            except ValueError:
                pass


        prop.currency = request.data.get('currency', prop.currency)

        if prop.currency == "$":
           prop.ethHouseValue = convert_fiat_to_eth(prop.house_value, "USD")
        elif prop.currency == "£":
            prop.ethHouseValue = convert_fiat_to_eth(prop.house_value, "GBP")
        elif prop.currency == "€":
            prop.ethHouseValue = convert_fiat_to_eth(prop.house_value, "EUR")

        prop.premium = calculate_premium_wei(prop.ethHouseValue)

        # File fields
        if 'ownership_proof' in request.FILES:
            prop.ownership_proof = request.FILES['ownership_proof']
        if 'insurance_proof' in request.FILES:
            prop.insurance_proof = request.FILES['insurance_proof']

        thread = threading.Thread(target=update_risk_level, args=(prop,))
        thread.start()

        prop.save()

        return Response({"detail": "Property details updated successfully"}, status=status.HTTP_200_OK)

def update_risk_level(prop):
    try:
        # Fetch and calculate the risk level in a different thread
        new_risk_level = get_disaster_risk(prop.postcode, prop.country)
        prop.riskLevel = new_risk_level
        prop.save(update_fields=['riskLevel'])
        print(f"Risk level updated for Property ID {prop.id}: {new_risk_level}")
    except Exception as e:
        print(f"Error updating risk level for Property ID {prop.id}: {e}")


@api_view(['POST'])
def update_user(request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return Response({"detail": "No or invalid token header."}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split("Bearer ")[1]
    user = User.objects.filter(token=token).first()
    if not user:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    data = request.data
    user.name = data.get('name', user.name)
    user.email = data.get('email', user.email)
    user.wallet_address = data.get('wallet_address', user.wallet_address)
    user.save()

    return Response({"detail": "User updated successfully"}, status=status.HTTP_200_OK)


@api_view(['POST'])
def create_claim(request):


    # 1. Identify the user by token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return Response({"detail": "No or invalid token header."}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split("Bearer ")[1]
    user = User.objects.filter(token=token).first()
    if not user:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
    # 2. Extract the form fields
    disaster_type = request.data.get('disaster_type', '')
    description = request.data.get('description', '')

    # optional policy id or rely on user.policy_id
    # or do something like:
    policy_id = request.data.get('policy_id', user.policy_id or "")


    import random
    new_claim_id = random.randint(100000, 999999)  # or a sequence approach

    # 3. Create the Claim
    claim = Claim.objects.create(
        user=user,
        disaster_type=disaster_type,
        description=description,
        policy_id=policy_id,
        claim_id=new_claim_id,
        status="OPEN"
    )


    # 4. Save images (files).
    # "files" is an array of files in the form data:
    # request.FILES.getlist('files')
    def generate_signature(claim_id, image):
        """Generate a digital signature for the given claim_id and file name."""
        secret_key = settings.SECRET_KEY.encode()
        image_bytes = image.read()
        data = f"{claim_id}".encode() + image_bytes
        signature = hmac.new(secret_key, data, hashlib.sha256).digest()
        return base64.b64encode(signature).decode()  # Store as Base64 string

    for file_obj in request.FILES.getlist('files'):
        signature = generate_signature(claim.claim_id, file_obj)

        ClaimImage.objects.create(
            claim=claim,
            image_file=file_obj,
            digital_signature=signature  # Save the signature
        )

    return Response({
        "detail": "Claim created successfully",
        "claim_id": claim.claim_id
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def get_recent_claim(request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return Response({"detail": "No or invalid token header."}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split("Bearer ")[1]
    user = User.objects.filter(token=token).first()
    if not user:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Get most recent claim for the user
        recent_claim = Claim.objects.filter(user=user).order_by('-id').first()

        if not recent_claim:
            return Response({"detail": "No claims found."}, status=status.HTTP_404_NOT_FOUND)

        def generate_signature(claim_id, image):
            """Generate a digital signature for the given claim_id and img."""
            secret_key = settings.SECRET_KEY.encode()
            image_bytes = image.read()
            data = f"{claim_id}".encode() + image_bytes

            signature = hmac.new(secret_key, data, hashlib.sha256).digest()
            return base64.b64encode(signature).decode()

        def verify_signature(claim_id, image):
            """Check if the stored signature matches the expected signature."""

            if not image.digital_signature:
                return False
            new_sig = generate_signature(claim_id, image.image_file)
            print(new_sig,image.digital_signature)
            ans = hmac.compare_digest(new_sig,image.digital_signature)
            print(ans)
            return ans

        images = ClaimImage.objects.filter(claim=recent_claim)
        image_data = [{
            "url": image.image_file.url,
            "signature_valid": verify_signature(recent_claim.claim_id, image)  # Add verification result
        } for image in images]
        # Prepare the response data
        data = {
            "claim_id": recent_claim.claim_id,
            "disaster_type": recent_claim.disaster_type,
            "description": recent_claim.description,
            "status": recent_claim.status,
            "policy_id": recent_claim.policy_id,
            "images": image_data
        }

        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_claims(request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return Response({"detail": "No or invalid token header."}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split("Bearer ")[1]

    # Check for Employee token
    employee = Employee.objects.filter(token=token).first()
    if employee and employee.role == "REVIEWER":
        # Return all claims if role is REVIEWER
        all_claims = Claim.objects.all().order_by('-id')
        data = []
        for claim in all_claims:
            data.append({
                "id": claim.id,
                "claim_id": claim.claim_id,
                "disaster_type": claim.disaster_type,
                "description": claim.description,
                "status": claim.status,
                "date_submitted": claim.date_submitted.isoformat() if claim.date_submitted else None,
                "images": [
                    {"url": request.build_absolute_uri(img.image_file.url)}
                    for img in claim.claim_images.all()
                ],
            })
        return Response(data, status=status.HTTP_200_OK)
    else:
        # Otherwise, check for User token
        user = User.objects.filter(token=token).first()
        if not user:
            return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

        user_claims = Claim.objects.filter(user=user).order_by('-id')
        data = []
        for claim in user_claims:
            data.append({
                "id": claim.id,
                "claim_id": claim.claim_id,
                "disaster_type": claim.disaster_type,
                "description": claim.description,
                "status": claim.status,
                "date_submitted": claim.date_submitted.isoformat() if claim.date_submitted else None,
                "images": [
                    {"url": request.build_absolute_uri(img.image_file.url)}
                    for img in claim.claim_images.all()
                ],
            })
        return Response(data, status=status.HTTP_200_OK)

def reviewer_decision(share, reviewer_decision):
    """Reviewer adds their decision securely to the share."""
    # Hash the reviewer's decision to ensure integrity
    decision_hash = hashlib.sha256(reviewer_decision.encode()).hexdigest()
    # Combine the original share with the reviewer's decision hash
    modified_share = f"{share}|{reviewer_decision}|{decision_hash}"
    return modified_share

def extract_original_share(modified_share):
    """Extract the original share from the modified one."""
    return modified_share.split("|")[0]  # Extracts the original share

def extract_reviewer_decision(modified_share):
    """Extract reviewer's decision from modified share."""
    return modified_share.split("|")[1]  # Gets reviewer's decision

@api_view(['POST'])
def review_claim(request, claim_id):
    token = request.headers.get('Authorization', '').split("Bearer ")[-1]
    employee = Employee.objects.filter(token=token).first()
    if not employee:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        claim = Claim.objects.get(id=claim_id)
    except Claim.DoesNotExist:
        return Response({"detail": "Claim not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        claim_review = ClaimReview.objects.get(claim=claim, employee=employee)
        related_share = claim_review.share  # Get the share value
    except ClaimReview.DoesNotExist:
        return Response({"detail": "No review found for this claim and reviewer."}, status=status.HTTP_404_NOT_FOUND)


    intensity = request.data.get('intensity')

    if intensity not in ['LITTLE_OR_NONE', 'MILD', 'SEVERE']:
        return Response({"detail": "Invalid intensity value"}, status=status.HTTP_400_BAD_REQUEST)

    if intensity == 'LITTLE_OR_NONE':
        intensity = 0
    elif intensity == 'MILD':
        intensity = 1
    elif intensity == 'SEVERE':
        intensity = 2

    modified_share = f"{related_share}:{intensity}"

    decision_share = reviewer_decision(
        share=related_share,
        reviewer_decision=modified_share)


    review, created = ClaimReview.objects.get_or_create(claim=claim, employee=employee)
    review.intensity = decision_share
    review.save()

    non_null_reviews = ClaimReview.objects.filter(claim=claim, intensity__isnull=False).count()

    if non_null_reviews >=3:
        intensities_list = list(
            ClaimReview.objects.filter(claim=claim, intensity__isnull=False)
            .values_list('intensity', flat=True)
        )
        ans = []
        for shares in intensities_list:
            # Ensure the shares contain a colon
            if ":" in shares:
                mnemonic2, version = shares.split(":")
                split_string = version.split("|")

                print(split_string[0])
                ans.append(int(split_string[0]))
            else:
                # Handle the case where there is no colon (e.g., log an error or skip this share)
                print(f"Skipping invalid share format: {shares}")
                continue  # Skip this invalid entry

        counter = Counter(ans)
        most_common = counter.most_common(1)

        original_shares = [extract_original_share(share) for share in intensities_list]
        reconstructed_secret = combine_mnemonics(original_shares)
        ClaimReview.objects.filter(claim=claim).update(intensity=most_common)
        if most_common[0][0] == 0:
            Claim.objects.filter(id=claim.id).update(ml_score=0, status="REJECTED")
        else:
            Claim.objects.filter(id=claim.id).update(ml_score=most_common[0][0], status="APPROVED")

    return Response({"detail": "Review submitted successfully"}, status=status.HTTP_200_OK)

def create_policy(request):
    print("List claims endpoint called")
    print(f"Request method: {request.method}")

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return Response({"detail": "No or invalid token header."}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split("Bearer ")[1]
    print(f"Token: {token}")

    user = User.objects.filter(token=token).first()
    if not user:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    print(f"User found: {user.email}")

