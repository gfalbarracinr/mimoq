import { check } from "k6";
import { Counter } from "k6/metrics";
import http from "k6/http";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

const BASE_URL = __ENV.API_URL || "https://api.example.com";
const stringVUS = __ENV.VUS || 10;
const stringDURATIONS = __ENV.DURATION || "30s";
const endpointsString =
  __ENV.ENDPOINTS || "/defaultPath1,/defaultPath2,/defaultPath3";
const delimiter = __ENV.DELIMITER || ",";
const ARCHIVO = __ENV.SUMMARY || 'summary.html';
const VUS = stringVUS.split(delimiter);
const DURATIONS = stringDURATIONS.split(delimiter);
const ENDPOINTS = endpointsString.split(delimiter);
const STAGES = [];
for (let i = 0; i < VUS.length; i++) {
  const duration = DURATIONS[i];
  const target = parseInt(VUS[i]);
  STAGES.push({ duration, target });
}
const stages = STAGES;
export const options = {
  stages: stages
};
const requestTotal= new Counter("number_of_requests");
const requestSucceed = new Counter("number_of_requests_succeded");
const requestFail = new Counter("number_of_requests_failed");
export default function () {
  const requests = ENDPOINTS.map((endpoint) => {
    return [
      "GET",
      `${BASE_URL}${endpoint}`,
      null,
      { tags: { name: "Stress_Test" } },
    ];
  });

  const responses = http.batch(requests);

  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];

    if (res.status === 200) {
      requestSucceed.add(1);
    } else {
      requestFail.add(1);
    }
    requestTotal.add(1);
  }
}

export function handleSummary(data) {
  const summary = `${ARCHIVO}`;
  return {
    [summary]: htmlReport(data),
  };
}
