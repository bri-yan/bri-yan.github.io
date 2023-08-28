# bri-yan.github.io

My personal website

# Overview
- To run locally, clone repo and run: `npm start`
- To deploy to github pages, run: `npm run deploy`

# Structure
- Assets are stored in the `public` folder
- Individual sections (train cabins and associated blurbs) are stored in the `cabins` folder
- Smaller components are stored in the `components` folder
- Components are compiled in `App.js`

## TO-DO: 
- [ ] Create separate cabins for separate sections
- [ ] Add a finger pointing icon to about me to encourage clicking the header
- [ ] Add links to about me
- [ ] Change background colour
- [ ] Load screen
- [ ] Edit webpage icon
- [ ] Change camera angle on-click
- [ ] Make camera slightly follow mouse
- [ ] Change train model

## NOTES:
- The title (my name) is stored in `components`
- Edit individual sections by finding that section's respective file in `cabins`
- `index.html` defines small details like webpage title and icon
- `package.json` defines small details like project name and homepage
- Top-down view can be achieved with coordinates [0, y, 0]
- Consider just making headers clickable to change POV