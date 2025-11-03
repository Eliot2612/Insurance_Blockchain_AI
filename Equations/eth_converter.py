import requests

def get_eth_rate(currency_code):
    url = f"https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms={currency_code}"
    response = requests.get(url)
    data = response.json()
    if currency_code in data:
        return data[currency_code]
    else:
        raise ValueError(f"Exchange rate for {currency_code} not found.")

def convert_fiat_to_eth(amount, currency_code):
    rate = get_eth_rate(currency_code)
    eth_value = amount / rate
    return eth_value

def eth_to_wei(eth_amount):
    return int(eth_amount * (10 ** 18))

def wei_to_eth(wei_amount):
    return wei_amount / (10 ** 18)

def convert_currency_to_eth():
    fiat_amount = float(input("Enter the fiat amount: "))
    currency_code = input("Enter your fiat currency code: ").strip().upper()

    eth_value = convert_fiat_to_eth(fiat_amount, currency_code)
    wei_value = eth_to_wei(eth_value)

    print(f"\nResults ")
    print(f"{fiat_amount} {currency_code} is approximately {eth_value} ETH")
    print(f"This is approximately {wei_value} Wei")

# --- Example Usage (Direct Execution) ---
if __name__ == "__main__":
    convert_currency_to_eth()
