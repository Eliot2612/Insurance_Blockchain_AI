export const validateInput = (input) => {
  // Only allow letters (a-z, A-Z), spaces, and hyphens
  if (!/^[a-zA-Z\s-]*$/.test(input)) {
    return false; // Invalid input
  }
  return input.trim();
};

export const validateEmail = (email) => {
  // Basic email format validation using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateWalletAddress = (input) => {
  // Allow input if it starts with '0x' and contains only hex characters
  if (/^0x[a-fA-F0-9]*$/.test(input)) {
    return input; // Allow typing
  }
  return false; // Invalid character detected
};

export const handleInputChange = (setter, setError, fieldName, validator = null) => (e) => {
  const value = e.target.value;

  if (validator) {
    const isValid = validator(value);

    if (isValid === false) {
      setError(`${fieldName} contains invalid characters.`);
    } else {
      setError(''); // Clear error if valid
    }
  }

  setter(value); // Always update state to allow typing
};



