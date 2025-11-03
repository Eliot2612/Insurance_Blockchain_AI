import React, { useState } from 'react';

const ImageDropdown = () => {
  // State to store selected option and corresponding image
  const [selectedOption, setSelectedOption] = useState('option1');

  // Images associated with each option (local image paths)
  const images = {
    option1: 'visualisations/precip_mm-wind_mph Graph.png',  // Local image path in public folder
    option2: 'visualisations/humidity-wind_mph Graph.png',
    option3: 'visualisations/temperature_celsius-wind_mph Graph.png',
    option4: 'visualisations/gust_mph-wind_mph Graph.png',
  };

  // Handle change in dropdown
  const handleChange = (event) => {
    setSelectedOption(event.target.value);
  };

  return (
    <div>
      <select onChange={handleChange} value={selectedOption}>
        <option value="option1">Precipitation-Wind Graph</option>
        <option value="option2">Humidity-Wind Graph</option>
        <option value="option3">Temperature-Wind Graph</option>
        <option value="option4">Gust-Wind Graph</option>
      </select>

      <div>
        {/* Display the image based on selected option */}
        <img src={images[selectedOption]} alt="Selected" style={{ width: '300px', height: 'auto' }} />
      </div>
    </div>
  );
};

export default ImageDropdown;
