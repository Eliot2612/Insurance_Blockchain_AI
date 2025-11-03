import pandas as pd
import numpy as np
import kagglehub
from kagglehub import KaggleDatasetAdapter
import os.path, pickle
from time import time
"""Weather_Detection_Model.ipynb

"""

"""# Preprocessing

## Label Data
"""

# Redownload if dataset is [by default] a day or greater out of date
DATASET_TIMEOUT_SECONDS = 86400

def download_dataset(save=True):
  LOCAL_DF_PATH = "./last_downloaded_dataset.df"
  """
  In production save should always be true, mostly included
  as a toggle as good practice.
  """
  path = kagglehub.dataset_download("nelgiriyewithana/global-weather-repository")
  print("Path to dataset files:", path)

  # Load and assign the latest version
  dataset_df = kagglehub.dataset_load(
      KaggleDatasetAdapter.PANDAS,
      "nelgiriyewithana/global-weather-repository",
      "GlobalWeatherRepository.csv",
    )
  
  if save:
    with open(LOCAL_DF_PATH,"wb") as df_file:
      pickle.dump(dataset_df, df_file)

  return dataset_df

def get_dataset(force_reload=False):

  # Version changes with each day, so we use a different path for our backup
  # than the .../.cache/ one.
  LOCAL_DF_PATH = "./last_downloaded_dataset.df"

  # If dataset download fails for any reason, use the backup
  if force_reload:
    dataset_df = download_dataset()
  else:
    try:
      if os.path.isfile(LOCAL_DF_PATH):
        with open(LOCAL_DF_PATH, 'rb') as df_file:
          dataset_df = pickle.load(df_file)
        if abs(dataset_df.max()['last_updated_epoch'] - time()) >= DATASET_TIMEOUT_SECONDS:
          print("Dataset is old, redownloading")
          dataset_df = download_dataset()
      else:
        raise FileNotFoundError("Local dataset backup not found.")
    except FileNotFoundError:
      dataset_df = download_dataset()

  return dataset_df


def preprocess_dataset(dataset_df, normalise=True):
  # Seperate x (data) from y (labels) from everything else we dont want atall
  # Define MIN/MAX weather thresholds
  MAX_WIND = 260
  MAX_TEMPERATURE = 60
  MIN_TEMPERATURE = -40
  MAX_PRECIPITATION = 1900
  MAX_HUMIDITY = 100
  MIN_HUMIDITY = 0

  # default value is wind_kph
  x_no_date = dataset_df.iloc[:, 10:11]

  # btw, the reason pressure is left out is because it completely breaks
  # outlier detection for some reason. maybe due to the way its distributed?
  # im stumped honestly which is why i chose just to omit it
  values_to_keep = ['temperature_celsius', 'precip_mm', 'humidity', 'gust_mph']

  for i in values_to_keep:
    x_no_date = x_no_date.join(dataset_df[i])

  x_date = dataset_df['last_updated']

  # Remove impossible values caused by malfunctioning sensors
  x_no_date = x_no_date[(x_no_date.wind_mph <= MAX_WIND)]
  x_no_date = x_no_date[(x_no_date.temperature_celsius <= MAX_TEMPERATURE)]
  x_no_date = x_no_date[(x_no_date.temperature_celsius >= MIN_TEMPERATURE)]
  x_no_date = x_no_date[(x_no_date.precip_mm <= MAX_PRECIPITATION)]
  x_no_date = x_no_date[(x_no_date.humidity <= MAX_HUMIDITY)]
  x_no_date = x_no_date[(x_no_date.humidity >= MIN_HUMIDITY)]
  normalised_x = x_no_date
  if normalise:
  # Final preprocessing on x
    x_df = x_no_date
    normalisation_coeff = (x_df.max())
    normalised_x=(x_df-x_df.min())/(x_df.max()-x_df.min())
  return normalised_x

"""
# Model

# Training
"""

def create_model(normalised_x, load_saved=False):

  import numpy as np
  from sklearn.neighbors import LocalOutlierFactor

  LOCAL_MODEL_PARAMS_FILE = "./last_trained_model"

  lof = LocalOutlierFactor(n_neighbors=20, novelty=True)
  if load_saved:
    #try:
      with open(LOCAL_MODEL_PARAMS_FILE, "rb") as model_file:
        anomalies = pickle.load(model_file)
    #except:
    #  print("Error loading model file. Aborting.")
    #  raise IOError
  else:
    anomalies = lof.fit(normalised_x.values)
    with open(LOCAL_MODEL_PARAMS_FILE, "wb") as model_file:
      pickle.dump(anomalies, model_file)

  return anomalies

"""# Auxillary Functions"""

from sklearn.metrics.pairwise import haversine_distances
from math import radians

def get_closest_cities_to_lat_lon(lat, lon, city_df, cities_to_keep=3):
  '''
  Given a latitude, longitude, and dataframe with columns labeled
  latitude and longitude, outputs the haversine distance for
  each row to the given lat and longitude.

  Returns the input dataframe with an appended haversine distances,
  sorted such that the first row is the closest city. Only
  cities_to_keep distinct locations are returned, the rest are
  trimmed.
  '''

  city_lat_lon_df = city_df.iloc[:, 0:4].join(city_df['last_updated']).join(city_df['wind_mph'])
  for i in values_to_keep:
    city_lat_lon_df = city_lat_lon_df.join(city_df[i])

  lat_lon = [lat, lon]
  lat_lon_r = [radians(_) for _ in lat_lon]
  city_distances = []

  for index,i in city_lat_lon_df.iterrows():
    i_lat_lon = [int(i['latitude']), int(i['longitude'])]
    i_lat_lon_r = [radians(_) for _ in i_lat_lon]
    i_distance = haversine_distances([lat_lon_r, i_lat_lon_r])
    city_distances.append(i_distance[0][0] + i_distance[0][1])

  city_df['haversine_distance_to_point'] = city_distances
  distinct_distance_df = city_df.drop_duplicates(subset=['location_name'])
  distinct_distance_df = distinct_distance_df.sort_values(by=['haversine_distance_to_point'])
  city_df = city_df.sort_values(by=['haversine_distance_to_point'])
  city_df = city_df[(city_df['haversine_distance_to_point'] <= distinct_distance_df.iloc[cities_to_keep]['haversine_distance_to_point'])]

  return city_df

# Get cities closest to Newcastle (as an example)
#get_closest_cities_to_lat_lon(54.9787632, 1.6094462, city_lat_lon_df)

import datetime as dt
import numpy as np

def get_extreme_weather_probabilities_over_timeframe(weather_dataset, model, timeframe_in_days=21):

  '''
  Takes a dataframe of datetime-labelled weather data,and a machine learning model with a
  predict() method. Over timeframe_in_days since datetime.today(), splits input dataframe into sub-frames split
  by day and runs predict on each sub-frame. Finally, converts predictions into a per-day probability of
  extreme weather.

  Note: day-based voting is used instead of specifically sensor-based voting because oftentimes
  sensors do not record at exactly the same time. Day-based voting allows us to approximate sensor-based
  voting (every sensor will record at some point in each day) while getting around this problem.

  RETURNS: An array of floats between 1.0 and -1.0, representing chance of extreme weather per day.
  1.0 is the highest confidence that datapoint is NOT extreme weather, -1.0 is the highest confidence
  that the datapoint IS extreme weather.
  '''

  # Set up local variables
  timeframe_end = dt.date.today() - dt.timedelta(days=timeframe_in_days)
  weather_df = weather_dataset.iloc[:, 6:7].join(weather_dataset['wind_mph'])

  for i in values_to_keep:
    weather_df = weather_df.join(weather_dataset[i])
  # Drop days that are not in our timeframe
  for index, i in weather_df.iterrows():
    if dt.datetime.strptime(i['last_updated'].split(" ")[0],"%Y-%m-%d") < dt.datetime.combine(timeframe_end, dt.datetime.min.time()):
      weather_df = weather_df.drop(index)

  # Convert dataframe to day-based sub-frames
  day_weather_dataframes = {}
  for index, i in weather_df.iterrows():
    if i['last_updated'].split(" ")[0] not in day_weather_dataframes.keys():
      day_weather_dataframes[i['last_updated'].split(" ")[0]] = i[1:].to_frame().T
    else:
      day_weather_dataframes[i['last_updated'].split(" ")[0]] = day_weather_dataframes[i['last_updated'].split(" ")[0]]._append(i[1:].to_frame().T)

  # Get day-based probabilities and return
  pred_probabilities = []
  for i in day_weather_dataframes.values():
    i_pred_arr = model.predict(i / normalisation_coeff)
    pred_probabilities.append(np.sum(i_pred_arr)/len(i_pred_arr))

  return pred_probabilities

def get_extreme_weather_over_timeframe(weather_dataset, model, timeframe_in_days=21, percent_to_consider_extreme=100):

  '''
  Wrapper for function above, that returns percent of extreme weather days
  using the given dataset over the given timeframe as an integer between 0 and 1.

  percent_to_consider_extreme controls how many readings on a given day need
  to be extreme for a day to be considered extreme. 100 means all readings need
  to be outliers.
  '''

  prob_arr = [(i + 1) / 2 for i in get_extreme_weather_probabilities_over_timeframe(weather_dataset, model, timeframe_in_days)]
  non_extreme_events = 0

  for i in prob_arr:
    if i > 1 - (percent_to_consider_extreme / 100): non_extreme_events += 1

  return (len(prob_arr) - non_extreme_events) / len(prob_arr)

def get_extreme_weather(lat, lon, timeframe_in_days=21, percent_to_consider_extreme=100, sensors_to_use=3, force_reload_dataset=False):
  """
  This is a wrapper designed to be used by anyone. Does all the
  "hard work" for you - takes a latitude, longitude and timeframe
  and outputs the amount of extreme weather days in said timeframe.
  Optionally provide a threshold to consider extreme.

  percent_to_consider_extreme: 100 = all events on a day need to be outliers
  to consider that day extreme. 0 means none need to be outliers.
  sensors_to_use: how many sensors to use. Sensors will always be used closest
  to furthest so =3 means 3 closest sensors to (lat, long) will be used.
  """
  global values_to_keep
  global normalisation_coeff
  values_to_keep = ['temperature_celsius', 'precip_mm', 'humidity', 'gust_mph']
  dataset = get_dataset(force_reload_dataset)
  normalised_x = preprocess_dataset(dataset)
  normalisation_coeff = preprocess_dataset(dataset, normalise=False).max()
  closest_x = get_closest_cities_to_lat_lon(lat, lon, dataset, sensors_to_use)
  model = create_model(normalised_x)

  return get_extreme_weather_over_timeframe(closest_x, model, timeframe_in_days, percent_to_consider_extreme)

def visualise_model(x='wind_mph', y='precip_mm', model=None, dataset=None):
  from mlxtend.plotting import plot_decision_regions
  import matplotlib.pyplot as plt
  from sklearn import datasets
  from sklearn.svm import SVC

  if dataset.any().any() == False:
    dataset = get_dataset()
  normalised_x = preprocess_dataset(dataset)
  raw_x = preprocess_dataset(dataset, normalise=False)
  if model == None:
    model = create_model(normalised_x)

  raw_x['predictions'] = model.predict(normalised_x)
  inliers = raw_x[(raw_x.predictions == 1)]
  outliers = raw_x[(raw_x.predictions == -1)]
  fig, ax = plt.subplots()
  ax.scatter([inliers[x]],[inliers[y]], label='Normal', s=5, alpha=0.3)
  ax.scatter([outliers[x]],[outliers[y]], label='Extreme', s=5, alpha=0.3)
  #plt.scatter([raw_x['wind_mph']],[raw_x['precip_mm']])
  ax.legend()
  ax.grid(True)
  title = "{}-{} Graph".format(x, y)
  plt.title("{}-{} Graph".format(x, y))
  plt.savefig("frontend/public/visualisations/{}.png".format(title), dpi=500)

def fetch_and_save_visualisations(y_arr=['wind_mph', 'gust_mph', 'humidity','temperature_celsius', 'precip_mm'], x_equals_y=True, fallback_x_arr=['wind_mph']):
  # Gets every possible permutation of visualisation.
  if x_equals_y:
    fallback_x_arr = y_arr
  dataset = get_dataset()
  model = create_model(preprocess_dataset(get_dataset()))
  for i in y_arr:
    for ii in fallback_x_arr:
      if i != ii:
        visualise_model(i, ii, model=model, dataset=dataset)

#visualise_model(model=create_model(preprocess_dataset(get_dataset())), dataset=get_dataset())
#fetch_and_save_visualisations(x_equals_y=False, fallback_x_arr=['wind_mph'])
#model = create_model(preprocess_dataset(get_dataset()), load_saved=True)
#visualise_model('humidity', 'gust_mph')
#print(get_extreme_weather(51.5072, -0.1, timeframe_in_days=21, percent_to_consider_extreme=50))