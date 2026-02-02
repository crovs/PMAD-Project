# GeoSnap - Photo Journal PWA

A minimalist Progressive Web App that allows you to capture photos with automatic geolocation tagging, creating a personal travel diary with timeline and map views.

![GeoSnap Icon](assets/icons/icon-192x192.png)

## 📸 Features

- **Camera Integration**: Capture photos directly using your device camera
- **Automatic Geolocation**: Photos are automatically tagged with your current location
- **Timeline Feed**: View all your memories in a beautiful grid layout
- **Interactive Map**: Explore your photos on an interactive map
- **Offline Support**: Works completely offline with Service Worker caching
- **Installable**: Add to home screen as a native-like app
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop

## 🎯 PMAD Project Criteria

This project fulfills all the requirements for the PMAD course:

### ✅ Technologies
- **HTML, CSS, JavaScript**: Pure vanilla stack, no frameworks
- **Progressive Web App**: Complete PWA implementation

### ✅ Installable Application
- Includes `manifest.json` with app metadata
- Icons in multiple sizes (192x192, 512x512)
- Proper theme colors and display settings
- Can be added to home screen on mobile devices

### ✅ Native Device Features (2+)
1. **Camera API** (`MediaDevices.getUserMedia`)
   - Access device camera for photo capture
   - Live camera preview
   - Fallback to file input if camera unavailable
   - Located in: `js/camera.js`

2. **Geolocation API** (`navigator.geolocation`)
   - Captures current location coordinates
   - Reverse geocoding to get location names
   - Permission handling and error management
   - Located in: `js/geolocation.js`

### ✅ Offline Functionality
- **Service Worker** (`sw.js`) with two caching strategies:
  - **Cache First**: For static assets (HTML, CSS, JS, icons)
  - **Network First**: For API calls and dynamic content
- **IndexedDB**: All photos stored locally in `js/storage.js`
- **Offline Indicator**: Visual feedback when offline
- All core features work without internet connection

### ✅ Three Views with Consistent Flow
1. **Feed View** (`index.html` - Feed section)
   - Timeline of all captured memories
   - Photo grid with location and timestamp
   
2. **Camera View** (`index.html` - Camera section)
   - Live camera preview
   - Capture button
   - Auto-saves with location data
   
3. **Map View** (`index.html` - Map section)
   - Interactive map using Leaflet.js
   - Markers for each geotagged photo
   - Popups with photo previews

**Navigation**: Bottom tab navigation for seamless view switching

### ✅ Hosted on Server
- Designed for deployment on **Netlify**
- HTTPS ready
- Connected to GitHub repository
- No build process required for deployment

### ✅ Responsiveness
- Mobile-first design
- Responsive grid layouts
- Adapts to all screen sizes
- CSS media queries in `css/main.css`

### ✅ Performance
- Lightweight vanilla JavaScript
- Optimized image storage
- Service Worker caching
- Fast load times
- Lighthouse-ready

### ✅ Caching Strategy
Service Worker implements multiple strategies:
- **Cache First**: Static assets (HTML, CSS, JS, icons)
- **Cache First**: External libraries (Leaflet.js, map tiles)
- **Network First**: API calls (geocoding)
- **Dynamic Cache**: Runtime caching for flexibility

Detailed in: `sw.js`

### ✅ Documentation
- Well-commented source code
- This comprehensive README
- Inline documentation in all JS modules

### ✅ Code Quality
- Modular architecture
- Separation of concerns
- Clear naming conventions
- ES6+ JavaScript
- No external dependencies (except Leaflet for maps)

## 🚀 Getting Started

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd PMAD-Project
   ```

2. **Serve locally**
   
   You need a local server for Service Worker to work. Use one of these methods:
   
   **Python 3:**
   ```bash
   python3 -m http.server 8000
   ```
   
   **Node.js (npx):**
   ```bash
   npx http-server -p 8000
   ```
   
   **VS Code Live Server:**
   - Install "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### Deployment to Netlify

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import existing project"
   - Connect your GitHub repository
   - Build settings:
     - Build command: (leave empty)
     - Publish directory: `/`
   - Click "Deploy"

3. **Done!** Your app is now live on HTTPS 🎉

## 📁 Project Structure

```
PMAD-Project/
├── index.html              # Main entry point (single-page app)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── css/
│   ├── main.css           # Design system & base styles
│   └── views.css          # View-specific styles
├── js/
│   ├── app.js             # Main app logic & navigation
│   ├── camera.js          # Camera API integration
│   ├── geolocation.js     # Geolocation API & reverse geocoding
│   ├── storage.js         # IndexedDB wrapper
│   └── map.js             # Leaflet map integration
├── assets/
│   └── icons/             # PWA icons (192x192, 512x512)
└── README.md              # This file
```

## 🛠️ Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Custom properties, Flexbox, Grid
- **JavaScript (ES6+)**: Modules, async/await, classes
- **IndexedDB**: Local photo storage
- **Service Worker**: Offline functionality
- **Leaflet.js**: Interactive maps
- **OpenStreetMap**: Map tiles
- **Nominatim API**: Reverse geocoding (free, no API key needed)

## 📱 Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ⚠️ Camera API requires HTTPS (or localhost)

## 🧪 Testing

### Manual Testing Checklist

- [ ] Install app to home screen
- [ ] Grant camera permission
- [ ] Capture photo
- [ ] Grant location permission
- [ ] Check location is tagged
- [ ] View photo in feed
- [ ] View photo on map
- [ ] Go offline (airplane mode)
- [ ] Verify app still loads
- [ ] Verify photos still visible offline

### Lighthouse Audit

Run Lighthouse in Chrome DevTools:
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App"
4. Click "Generate report"

**Expected scores:**
- PWA: 100
- Performance: 90+
- Accessibility: 95+

## 📝 License

This project is created for educational purposes as part of the PMAD course.

## 👨‍💻 Author

Created with ❤️ by Ahmet Yada using vanilla HTML, CSS, and JavaScript
