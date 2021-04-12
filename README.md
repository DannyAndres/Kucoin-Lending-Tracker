# Instructions

* Install all dependencies

'''npm i''' 

* Change examples files to real ones

config.example.js -> config.js

database.example.json -> database.json

* Add your api keys to the config file

IMPORTANT, the api will need general permissions for obvious reasons but also need trading permissions, this is because lend data like opened orders are only visible with trading permissions, but to be clear trading permissions also will allow that api to run trades, start/stop auto lending or even more so I recommend you to read the index.js file code to check every detail of it, but will NOT do any of those things, the program only get data of the api, does not push or act in any way.

ALSO do not activate the withdrawal permissions because this program do NOT use it in any way, and be safe by keeping your api credentials on your device only without sharing them online.

once the keys are in the program, they will not be sent anywhere, now they are on your computer only.

the program needs: key, secret, passphrase

* Run the program

if you only want to see the data once 

'''node index.js'''

if you want to keep the program running and updated by itself in every 5 minutes

'''node index.js 5 autoplay'''
