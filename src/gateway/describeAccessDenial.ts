// describeAccessDenial explains a Console policy denial carried in a 403 problem ("Not permitted: <denial>").
export function describeAccessDenial(detail: string | undefined): string {
  const denial = detail?.startsWith("Not permitted: ") ? detail.slice("Not permitted: ".length) : "";
  switch (denial) {
    case "production_admin_required":
      return "This is a Production cluster: only an ADMIN for it may change it.";
    case "change_reason_required":
      return "Production changes need a recorded change reason.";
    case "environment_unclassified":
      return "This cluster is not classified yet, so all Kafka changes are blocked.";
    default:
      return "Your role does not allow this action on this cluster.";
  }
}
