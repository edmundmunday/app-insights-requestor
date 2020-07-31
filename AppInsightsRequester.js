//RP for HTTP requests
const rp = require("request-promise");
const dotEnv = require("dotenv").config(); //Use the .env file to load the variables
class AppInsightsRequester {
  /**
   * @param {object} data - shared 'data' object holding the customer data from the previous iteration of queries.
   * @param {string} query - the query to be run against AppInsights.
   * @param {string} attributeName - the name to be given to the attribute this query returns.
   */
  constructor({
    data = {},
    query = "No query was passed to the requestor",
    attributeName = "Unnamed Attribute",
    timeFilter = "No time filter was passed to the requestor"
  } = {}) {
    this.data = data;
    this.query = query;
    this.attributeName = attributeName;
    this.timeFilter = timeFilter;
    this._apiKey = process.env.APP_INSIGHTS_API_KEY;
    this._appId = process.env.APP_INSIGHTS_APP_ID;
  }

  /**
   * - Makes a request to AppInsights using the query the class was instantiated with, sorts returned information into the 'data' object.
   * @returns {Promise} - when resolved, the data object will be populated with new information.
   */
  makeRequest() {
    return new Promise((resolve, reject) => {
      this._appInsightsRequest()
        .then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /**
   * - Makes an RP request using the generated RP options and then passes the response to the dataParser.
   * @returns {Promise} - when resolved, the data object will be populated with new information.
   */
  _appInsightsRequest() {
    return new Promise((resolve, reject) => {
      // define RP options
      let options = this._rpOptions(this.query);

      // make request to AppInsights
      rp(options)
        .then(response => {
          // sort/parse the data by customerShortName
          this._dataParser(response);

          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /**
   * @returns {object} - constructs the configuration object for the RP request.
   */
  _rpOptions() {
    return {
      method: "GET",
      uri: `https://api.applicationinsights.io/v1/apps/${this._appId}/query?query=${this.query}`,
      headers: {
        "x-api-key": this._apiKey
      }
    };
  }

  /**
   * - Filters the AppInsights response and adds the values from it to the shared 'data' object.
   * @param {object} response - the RP response from AppInsights
   */
  _dataParser(response) {
    let parsedResponse = JSON.parse(response);

    // Each row represents the consolidated data for a single customer.
    parsedResponse.tables[0].rows.forEach(row => {
      //Azure returns the data as elements in an array, not properties of an object, this is a bit weird.
      // extract customer shortName
      let customerShortName = row[0];
      // extract count of records
      let rowCount = row[1];

      // check if the data object already has this customer included
      this.data[customerShortName]
        ? false
        : (this.data[customerShortName] = {});

      // add the attributeName for this request to the shared 'data' object and set it equal to the row count.
      this.data[customerShortName][this.attributeName] = rowCount;
    });
  }
}

module.exports = AppInsightsRequester;
