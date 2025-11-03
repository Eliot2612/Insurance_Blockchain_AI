
def calculate_premium_wei(house_value_wei, coverage_percentage=0.80, premium_rate=0.002):

    # Fixed base premium in Wei

    base_premium_wei = 0.00065  # Fixed base monthly premium around £70 in GBP

    # Calculate the insured portion of the house value in Wei.

    insured_value_wei = house_value_wei * coverage_percentage

    # Compute the risk-based premium in Wei.

    risk_based_premium_wei = insured_value_wei * premium_rate

    # Compute the total monthly premium.

    total_monthly_premium_wei = base_premium_wei + risk_based_premium_wei

    return total_monthly_premium_wei

