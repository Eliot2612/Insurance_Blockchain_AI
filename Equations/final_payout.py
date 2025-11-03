def final_payout_estimate_wei(d_final, house_value_wei, coverage_percentage=0.80):
    """
    Calculates the Final Official Payout in Wei without any multiplier or deductible.

    Parameters:
      d_final (float): Final damage score after review (e.g., 0.65 for 65% damage).
      house_value_wei (int): House value in Wei.
      coverage_percentage (float): Fraction of the house's value that is insured.
                                   Default is 0.80 (80%).

    Returns:
      int: The final payout in Wei.
    """
    # Calculate the insured portion of the house value in Wei.
    insured_value_wei = house_value_wei * coverage_percentage

    # Compute the final payout by multiplying by the final damage score.
    final_payout_wei = int(insured_value_wei * d_final)
    return final_payout_wei


if __name__ == "__main__":
    print("=== Final Payout Estimator (Wei) ===")

    try:
        house_value_input = input("Enter the house value in Wei: ")
        house_value_wei = int(house_value_input)
    except ValueError:
        print("Invalid input. Please enter an integer representing the house value in Wei.")
        exit(1)

    try:
        d_final = float(input("Enter the final damage score after review (e.g., 0.65 for 65% damage): "))
        # Coverage percentage is fixed to 80%
        coverage_percentage = 0.80
    except ValueError:
        print("Invalid input. Please enter numeric values.")
        exit(1)

    payout = final_payout_estimate_wei(d_final, house_value_wei, coverage_percentage)
    print(f"\nEstimated Final Payout in Wei: {payout}")

