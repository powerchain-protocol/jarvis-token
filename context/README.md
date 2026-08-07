# JARVIS token context

Builds deployment-aware token state from validated environment configuration. The context exposes environment, canonical asset, representation configuration, deployment readiness reasons, bridge activation, and token health.

A configured address is not automatically considered verified. Production should set `JARVIS_TOKEN_DEPLOYMENT_VERIFIED=true` only after deployment evidence has been independently checked.
