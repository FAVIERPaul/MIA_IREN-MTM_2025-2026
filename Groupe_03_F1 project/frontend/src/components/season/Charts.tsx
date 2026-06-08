import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, PolarArea } from "react-chartjs-2";
import type { ConstructorStanding, DriverStanding, RaceResult } from "../../types";
import { getTeamColor } from "../../f1utils";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, RadialLinearScale, Tooltip, Legend);
ChartJS.defaults.color = "#888888";
ChartJS.defaults.borderColor = "#333333";

export default function Charts({
  drivers,
  constructors,
  lastRace,
}: {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
  lastRace: RaceResult | null;
}) {
  const top10 = drivers.slice(0, 10);
  const winners = drivers.filter((d) => parseInt(d.wins) > 0);
  const raceScorers = (lastRace?.Results ?? []).filter((r) => parseFloat(r.points) > 0);

  return (
    <>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">Driver Points — Top 10</div>
          <div className="card-body chart-container">
            <Bar
              data={{
                labels: top10.map((d) => d.Driver.code || d.Driver.familyName),
                datasets: [
                  {
                    label: "Points",
                    data: top10.map((d) => parseFloat(d.points)),
                    backgroundColor: top10.map((d) => getTeamColor(d.Constructors[0]?.constructorId) + "CC"),
                    borderColor: top10.map((d) => getTeamColor(d.Constructors[0]?.constructorId)),
                    borderWidth: 1,
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items) => {
                        const d = top10[items[0].dataIndex];
                        return `${d.Driver.givenName} ${d.Driver.familyName}`;
                      },
                      afterLabel: (item) => `Team: ${top10[item.dataIndex].Constructors[0]?.name}`,
                    },
                  },
                },
                scales: {
                  x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { font: { family: "Orbitron", size: 10 } } },
                  y: { grid: { display: false }, ticks: { font: { family: "Orbitron", size: 11, weight: "bold" } } },
                },
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">Constructor Points Share</div>
          <div className="card-body chart-container">
            <Doughnut
              data={{
                labels: constructors.map((c) => c.Constructor.name),
                datasets: [
                  {
                    data: constructors.map((c) => parseFloat(c.points)),
                    backgroundColor: constructors.map((c) => getTeamColor(c.Constructor.constructorId) + "CC"),
                    borderColor: constructors.map((c) => getTeamColor(c.Constructor.constructorId)),
                    borderWidth: 2,
                    hoverOffset: 8,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "55%",
                plugins: {
                  legend: {
                    position: "right",
                    labels: { padding: 12, usePointStyle: true, font: { family: "Roboto", size: 11 } },
                  },
                  tooltip: {
                    callbacks: {
                      label: (item) => ` ${item.label}: ${item.raw} pts (${constructors[item.dataIndex].wins} wins)`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">Race Wins by Driver</div>
          <div className="card-body chart-container">
            <Bar
              data={{
                labels: winners.map((d) => d.Driver.code || d.Driver.familyName),
                datasets: [
                  {
                    label: "Wins",
                    data: winners.map((d) => parseInt(d.wins)),
                    backgroundColor: winners.map((d) => getTeamColor(d.Constructors[0]?.constructorId) + "CC"),
                    borderColor: winners.map((d) => getTeamColor(d.Constructors[0]?.constructorId)),
                    borderWidth: 1,
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items) => {
                        const d = winners[items[0].dataIndex];
                        return `${d.Driver.givenName} ${d.Driver.familyName}`;
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { family: "Orbitron", size: 11, weight: "bold" } } },
                  y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: { stepSize: 1, font: { family: "Orbitron", size: 10 } },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">Last Race — Points Scored</div>
          <div className="card-body chart-container">
            {raceScorers.length ? (
              <PolarArea
                data={{
                  labels: raceScorers.map((r) => r.Driver.code || r.Driver.familyName),
                  datasets: [
                    {
                      data: raceScorers.map((r) => parseFloat(r.points)),
                      backgroundColor: raceScorers.map((r) => getTeamColor(r.Constructor.constructorId) + "99"),
                      borderColor: raceScorers.map((r) => getTeamColor(r.Constructor.constructorId)),
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                      labels: { padding: 10, usePointStyle: true, font: { family: "Roboto", size: 11 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (item) => ` ${item.label}: P${raceScorers[item.dataIndex].position} — ${item.raw} pts`,
                      },
                    },
                  },
                  scales: { r: { grid: { color: "rgba(255,255,255,0.08)" }, ticks: { display: false } } },
                }}
              />
            ) : (
              <p className="muted">No race data available.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
