(async () => {
  try {
    const { default: app } = await import("./app.js");
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    // Print full error with stack and exit so we can diagnose module load failures
    // eslint-disable-next-line no-console
    console.error(err);
    // ensure non-zero exit
    process.exit(1);
  }
})();
