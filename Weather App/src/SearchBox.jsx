import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

function WeatherApp() {
  const [city, setCity] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState("");

  const API_URL = "https://api.openweathermap.org/data/2.5/weather";
  const API_KEY = "--------------------";

  const getWeatherInfo = async () => {
    if (!city.trim()) {
      setError("City name cannot be empty.");
      return;
    }
    setError(""); // Clear any previous error
    try {
      const response = await fetch(
        `${API_URL}?q=${city}&appid=${API_KEY}&units=metric`
      );
      if (!response.ok) {
        throw new Error(`City not found. Please try again.`);
      }
      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err.message);
      setWeatherData(null);
    }
  };

  const handleChange = (event) => {
    setCity(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    getWeatherInfo();
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <Typography variant="h4" gutterBottom>
        Weather App
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="City Name"
          variant="outlined"
          value={city}
          onChange={handleChange}
          required
          style={{ marginBottom: "20px", width: "300px" }}
        />
        <br />
        <Button variant="contained" type="submit" style={{ marginBottom: "20px" }}>
          Search
        </Button>
      </form>
      {error && (
        <Typography variant="body1" color="error" gutterBottom>
          {error}
        </Typography>
      )}
      {weatherData && (
        <Card style={{ maxWidth: "400px", margin: "0 auto", marginTop: "20px" }}>
          <CardContent>
            <Typography variant="h5">{weatherData.name}</Typography>
            <Typography variant="body1">
              Temperature: {weatherData.main.temp}°C
            </Typography>
            <Typography variant="body1">
              Weather: {weatherData.weather[0].description}
            </Typography>
            <Typography variant="body1">
              Humidity: {weatherData.main.humidity}%
            </Typography>
            <Typography variant="body1">
              Wind Speed: {weatherData.wind.speed} m/s
            </Typography>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WeatherApp;
