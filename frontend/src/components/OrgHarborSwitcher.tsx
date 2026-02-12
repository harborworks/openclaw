import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../auth";
import { useOptionalHarborContext } from "../contexts/HarborContext";
import { Dropdown, ChevronDown } from "./Dropdown";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orgsApi = (api as any).orgs;

interface Harbor {
  _id: string;
  name: string;
  slug: string;
}

interface OrgWithHarbors {
  _id: string;
  name: string;
  slug: string;
  role: string;
  harbors: Harbor[];
}

export function OrgHarborSwitcher() {
  const { user } = useAuth();
  const harbor = useOptionalHarborContext();
  const navigate = useNavigate();

  const cognitoSub = user?.userId;
  const orgs = useQuery(
    orgsApi.listWithHarbors,
    cognitoSub ? { cognitoSub } : "skip",
  ) as OrgWithHarbors[] | undefined;

  if (!orgs || orgs.length === 0) return null;

  const totalHarbors = orgs.reduce((n, o) => n + o.harbors.length, 0);
  const multiOrg = orgs.length > 1;

  // Single org, single harbor — static label
  if (!multiOrg && totalHarbors <= 1) {
    if (harbor) {
      return (
        <div className="switcher">
          <span className="switcher-label">
            {harbor.orgName} <span className="switcher-sep">/</span> {harbor.harborName}
          </span>
        </div>
      );
    }
    return null;
  }

  const label = harbor
    ? `${harbor.orgName} / ${harbor.harborName}`
    : "Select harbor…";

  return (
    <Dropdown
      className="switcher"
      trigger={() => (
        <button className="switcher-trigger">
          {label}
          <ChevronDown />
        </button>
      )}
    >
      {(close) => (
        <>
          {orgs.map((org) => (
            <div key={org._id} className="switcher-org-group">
              {multiOrg && (
                <div className="switcher-org-name">{org.name}</div>
              )}
              {org.harbors.map((h) => {
                const active = harbor?.harborId === h._id;
                return (
                  <button
                    key={h._id}
                    className={`switcher-item${active ? " switcher-item-active" : ""}`}
                    onClick={() => {
                      close();
                      navigate(`/${org.slug}/${h.slug}`);
                    }}
                  >
                    {h.name}
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
    </Dropdown>
  );
}
