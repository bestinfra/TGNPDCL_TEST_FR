# Google Maps Integration Setup

This project includes a Google Maps component for displaying feeder locations. To use this feature, you need to set up a Google Maps API key.

## Setup Steps

### 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API (if you plan to use places features)
4. Go to "Credentials" and create an API key
5. Restrict the API key to your domain for security

### 2. Add the API Key to Environment Variables

Create or update your `.env` file in the project root:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Restart Your Development Server

After adding the environment variable, restart your development server for the changes to take effect.

## Usage

The GoogleMap component is automatically used in the Feeders page to display the location of specific feeders. The component will:

- Center on the feeder's location if coordinates are available
- Fall back to a default location (India center) if no coordinates are found
- Display a marker at the feeder's location
- Allow interaction with the map

## Component Props

The GoogleMap component accepts the following props:

- `apiKey`: Your Google Maps API key
- `center`: Map center coordinates (defaults to India if no feeder location)
- `zoom`: Map zoom level (default: 15)
- `markerPosition`: Position for the marker (feeder location)
- `style`: Custom styling for the map container
- `onMapLoad`: Callback when the map loads
- `onMarkerClick`: Callback when the marker is clicked

## Troubleshooting

- **Map not loading**: Check that your API key is correct and the Maps JavaScript API is enabled
- **API key errors**: Ensure your API key has the necessary permissions and domain restrictions
- **Coordinates not showing**: Verify that your feeder data includes latitude and longitude information

## Security Notes

- Never commit your API key to version control
- Use environment variables for sensitive configuration
- Restrict your API key to specific domains and APIs
- Monitor your API usage to avoid unexpected charges
