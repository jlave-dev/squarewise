module.exports = {
  branches: ["main"],
  tagFormat: "v${version}",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
      },
    ],
    // GitHub branch protection requires PR-only changes on main, so releases
    // must tag and publish from the merged commit instead of pushing version
    // bump commits back to the repository.
    "@semantic-release/github",
  ],
};
