-- Add lat/lng coordinates to seed data procedures
-- so the map view can display markers

UPDATE procedures SET lat = 29.9511, lng = -90.0715
WHERE city = 'New Orleans' AND state = 'LA' AND is_seed = true;

UPDATE procedures SET lat = 29.9010, lng = -90.1671
WHERE city = 'Metairie' AND state = 'LA' AND is_seed = true;

UPDATE procedures SET lat = 30.3546, lng = -90.0840
WHERE city = 'Mandeville' AND state = 'LA' AND is_seed = true;

UPDATE procedures SET lat = 29.7604, lng = -95.3698
WHERE city = 'Houston' AND state = 'TX' AND is_seed = true;

UPDATE procedures SET lat = 32.7767, lng = -96.7970
WHERE city = 'Dallas' AND state = 'TX' AND is_seed = true;

UPDATE procedures SET lat = 33.7490, lng = -84.3880
WHERE city = 'Atlanta' AND state = 'GA' AND is_seed = true;

UPDATE procedures SET lat = 36.1627, lng = -86.7816
WHERE city = 'Nashville' AND state = 'TN' AND is_seed = true;

UPDATE procedures SET lat = 25.7617, lng = -80.1918
WHERE city = 'Miami' AND state = 'FL' AND is_seed = true;

UPDATE procedures SET lat = 29.7604, lng = -95.3698
WHERE city = 'The Woodlands' AND state = 'TX' AND is_seed = true;

UPDATE procedures SET lat = 40.7128, lng = -74.0060
WHERE city = 'New York' AND state = 'NY' AND is_seed = true;

UPDATE procedures SET lat = 34.0522, lng = -118.2437
WHERE city = 'Los Angeles' AND state = 'CA' AND is_seed = true;

UPDATE procedures SET lat = 34.0195, lng = -118.4912
WHERE city = 'Beverly Hills' AND state = 'CA' AND is_seed = true;

UPDATE procedures SET lat = 33.4942, lng = -111.9261
WHERE city = 'Scottsdale' AND state = 'AZ' AND is_seed = true;

UPDATE procedures SET lat = 41.8781, lng = -87.6298
WHERE city = 'Chicago' AND state = 'IL' AND is_seed = true;

UPDATE procedures SET lat = 35.2271, lng = -80.8431
WHERE city = 'Charlotte' AND state = 'NC' AND is_seed = true;
