import requests
import pycountry
from geopy.distance import geodesic
from ML.weather_detection_model import get_extreme_weather

# OpenStreetMap API for geocoding
GEOCODE_API_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "DisasterRiskChecker/1.0 (contact@example.com)"}

# Disaster hotspot database
DISASTER_HOTSPOTS = {
    # Major Tectonic Plate Boundaries & Earthquake Faults
    "San Andreas Fault (California, USA)": (35.775, -119.750),
    "Cascadia Subduction Zone (Pacific Northwest, USA/Canada)": (44.000, -125.000),
    "New Madrid Seismic Zone (Missouri, USA)": (36.6000, -89.6000),
    "North Anatolian Fault (Turkey)": (40.923, 32.521),
    "Japan Trench (Pacific Ring of Fire)": (38.000, 142.000),
    "Himalayan Collision Zone (Nepal, India)": (28.3949, 84.1240),
    "Alpide Belt (Italy, Greece, Turkey, Iran)": (42.7339, 12.8289),
    "South American Subduction Zone (Peru, Chile)": (-33.4489, -70.6693),
    "East African Rift (Ethiopia, Kenya, Tanzania)": (-6.3690, 34.8888),

    # Volcanic Eruption Risk Areas
    "Yellowstone Supervolcano (USA)": (44.4280, -110.5885),
    "Mount St. Helens (Washington, USA)": (46.1912, -122.1944),
    "Icelandic Volcanoes (Mid-Atlantic Ridge)": (64.1355, -21.8954),
    "Mount Fuji (Japan - Pacific Plate)": (35.3606, 138.7274),
    "Mount Vesuvius (Italy - African/Eurasian Plate)": (40.8224, 14.4289),
    "Krakatoa Volcano (Indonesia - Indo-Australian Plate)": (-6.102, 105.423),
    "Mount Etna (Italy)": (37.7550, 14.9950),
    "Taal Volcano (Philippines)": (14.0024, 120.9938),

    # Tsunami-Prone Subduction Zones
    "Tsunami Risk Zone (Indonesia)": (-0.7893, 113.9213),
    "Japan Trench Tsunami Zone (Japan)": (38.297, 141.883),
    "Cascadia Tsunami Zone (West Coast, USA/Canada)": (44.500, -125.000),
    "Chilean Tsunami Zone (South America)": (-33.047, -71.612),
    "Indian Ocean Tsunami Zone (Sri Lanka, India, Thailand)": (9.1220, 92.7440),

    # Hurricane, Cyclone, and Typhoon Hotspots
    "Hurricane Zone (Florida, USA)": (25.7617, -80.1918),
    "Gulf of Mexico Hurricane Zone (USA)": (27.500, -90.000),
    "Caribbean Hurricane Zone (Puerto Rico, Cuba, Bahamas)": (20.000, -75.000),
    "Indian Ocean Cyclone Zone (Bangladesh, India, Myanmar)": (20.000, 88.000),

    # Tornado & Extreme Storm Zones
    "Tornado Alley (USA - Texas, Oklahoma, Kansas)": (37.000, -97.000),
    "Great Plains Tornado Zone (Midwest USA)": (39.000, -94.000),
    "Bangladesh Tornado Risk Area": (24.000, 90.000),

    # Major Flood-Prone River Basins
    "Mississippi River Flood Zone (USA)": (34.000, -90.000),
    "Amazon River Flood Zone (Brazil)": (-3.4653, -62.2159),
    "Ganges River Flood Zone (India, Bangladesh)": (25.000, 83.000),

    # Wildfire Risk Areas
    "California Wildfire Zone (USA)": (37.7749, -119.4194),
    "Australia Bushfire Zone (Victoria, New South Wales)": (-37.8136, 144.9631),
    "Siberian Wildfire Zone (Russia)": (60.000, 105.000)
}

# Convert Country Name to ISO Code
def get_country_code(country_name):
    try:
        country = pycountry.countries.lookup(country_name)
        return country.alpha_2  # Returns two-letter country code (e.g., "US", "UK")
    except LookupError:
        raise ValueError(f"Invalid country name: {country_name}")

# Fetch Coordinates from Postal Code
def get_coordinates_from_postcode(postcode, country_name):
    country_code = get_country_code(country_name)  # Auto-convert country name to code
    params = {"postalcode": postcode, "country": country_code, "format": "json"}
    response = requests.get(GEOCODE_API_URL, params=params, headers=HEADERS)

    if response.status_code != 200:
        raise ValueError(f"Error fetching geocode data: HTTP {response.status_code}")

    data = response.json()

    if not data:
        raise ValueError(f"Could not fetch coordinates for postal code: {postcode} in {country_name}")

    # Select first matching location
    selected_location = data[0]
    lat, lon = float(selected_location['lat']), float(selected_location['lon'])
    return lat, lon, selected_location.get("display_name", "Unknown Location")

# Calculate Distance to Nearest Disaster Hotspot
def calculate_distance_to_hotspots(user_location):
    min_distance = float("inf")
    closest_hotspot = None

    for hotspot_name, hotspot_coords in DISASTER_HOTSPOTS.items():
        distance = geodesic(user_location, hotspot_coords).km
        if distance < min_distance:
            min_distance = distance
            closest_hotspot = (hotspot_name, hotspot_coords)

    return min_distance, closest_hotspot

# Normalized Risk Score Calculation
def get_normalized_risk_score(distance):
    risk_score = (
        10 if distance < 50 else
        8 if distance < 100 else
        6 if distance < 200 else
        4 if distance < 500 else
        2
    )
    return risk_score / 10  # Normalize to range 0 - 1

# Combine Risk Scores (Proximity + Disaster Frequency) need to pull frequency from lucy machine learning
def calculate_final_risk_score(proximity_risk_score, disaster_frequency_score):
    return round((proximity_risk_score + disaster_frequency_score) / 2, 2)

# Main Function to Get Disaster Risk
def get_disaster_risk(postcode,country_name):

    try:
        lat, lon, formatted_address = get_coordinates_from_postcode(postcode, country_name)
        disaster_frequency_score = get_extreme_weather(lat, lon, timeframe_in_days=365, percent_to_consider_extreme=50)
        location = (lat, lon)
        distance, nearest_hotspot = calculate_distance_to_hotspots(location)
        proximity_risk_score = get_normalized_risk_score(distance)

        # Calculate final risk score using both proximity and disaster frequency
        final_risk_score = calculate_final_risk_score(proximity_risk_score, disaster_frequency_score)

        print(f"\n Disaster Risk Assessment ")
        print(f"Postal Code: {postcode} ({country_name})")
        print(f"Location: {formatted_address}")
        print(f"Coordinates: {location}")
        print(f"Nearest Disaster-Prone Zone: {nearest_hotspot[0]}")
        print(f"Distance to Hotspot: {distance:.2f} km")
        print(f"Proximity Risk Score: {proximity_risk_score:.2f} (0 - 1 scale)")
        print(f"Disaster Frequency Score: {disaster_frequency_score:.2f} (0 - 1 scale)")
        print(f"Final Risk Score: {final_risk_score:.2f} (0 - 1 scale)")
        return final_risk_score

    except ValueError as e:
        print(f"Error: {e}")

# Allow direct execution from the command line
if __name__ == "__main__":
    get_disaster_risk()