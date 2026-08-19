let body = "";
process.stdin.on("data", chunk => { body += chunk; });
process.stdin.on("end", () => {
  const document = JSON.parse(body);
  const procedures = document["x-trpc-procedures"];
  if (!procedures?.admin?.includes("admin.bulkDryRun")) throw new Error("admin.bulkDryRun missing");
  if (!procedures?.protected?.includes("fleet.approvalsPage")) throw new Error("fleet.approvalsPage missing");
  console.log("openapi_runtime_contract=ok");
});
