def preliminary_payout_estimate_wei(d_pre, house_value_wei,coverage_percentage = 0.80):
    """
        Parameters:
      d_pre (float): Preliminary damage score (e.g., 0.70 for 70% damage).
      house_value_wei (int): House value in Wei.
      coverage_percentage (float): Fraction of the house's value that is insured (e.g., 0.80 for 80%).

    Returns:
      int: The estimated preliminary payout in Wei.
    """
    # Calculate the insured portion of the house value in Wei.
    insured_value_wei = house_value_wei * coverage_percentage

    # Compute the estimated payout by multiplying by the preliminary damage score.
    estimated_payout_wei = int(insured_value_wei * d_pre)
    return estimated_payout_wei


if __name__ == "__main__":
    print("Preliminary Payout Estimator")

    try:
        house_value_input = input("Enter the house value in Wei: ")
        house_value_wei = int(house_value_input)
    except ValueError:
        print("Invalid input. Please enter an integer representing the house value in Wei.")
        exit(1)

    try:
        d_pre = float(input("Enter the preliminary damage score (e.g., 0.70 for 70% damage): "))
        # Coverage percentage is fixed to 80%
        coverage_percentage = 0.80
    except ValueError:
        print("Invalid input. Please enter numeric values.")
        exit(1)

    payout = preliminary_payout_estimate_wei(d_pre, house_value_wei, coverage_percentage)
    print(f"\nEstimated Preliminary Payout in Wei: {payout}")
