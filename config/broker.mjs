const BASE = process.env.BROKER_API_URL;

const headers = {
  "X-Booker-Group": process.env.BROKER_GROUP_TOKEN,
  "Content-Type": "application/json",
};

export class BrokerError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call(path) {
  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new BrokerError(0, "UNREACHABLE", error.message);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new BrokerError(
      response.status,
      data.code || "BROKER_ERROR",
      data.error || "Broker request failed"
    );
  }

  return data;
}

async function post(path, payload, extraHeaders = {}) {
  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        ...headers,
        ...extraHeaders,
      },
      ...(payload === undefined
        ? {}
        : { body: JSON.stringify(payload) }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new BrokerError(0, "UNREACHABLE", error.message);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new BrokerError(
      response.status,
      data.code || "BROKER_ERROR",
      data.error || "Broker request failed"
    );
  }

  return data;
}

export const broker = {
  inventory: (type) => call(`/${type}/inventory`),

  proxmoxAvailability: () => call("/proxmox/availability"),

  availability: (type) => {
    const allowedTypes = ["proxmox", "maas", "openstack"];

    if (!allowedTypes.includes(type)) {
      throw new Error("Unsupported broker type");
    }

    return call(`/${type}/availability`);
  },

  allocate: (type, payload) => {
    const allowedTypes = ["proxmox", "maas", "openstack"];

    if (!allowedTypes.includes(type)) {
      throw new Error("Unsupported broker type");
    }

    return post(`/${type}/allocations`, payload);
  },

  allocations: async (type) => {
    const allowedTypes = ["proxmox", "maas", "openstack"];

    if (!allowedTypes.includes(type)) {
      throw new Error("Unsupported broker type");
    }

    return call(`/${type}/allocations`);
  },

  withdraw: (type, id, secret) => {
    const allowedTypes = ["proxmox", "maas", "openstack"];

    if (!allowedTypes.includes(type)) {
      throw new Error("Unsupported broker type");
    }

    return post(
      `/${type}/allocations/${encodeURIComponent(id)}/withdraw`,
      undefined,
      { "X-Booker-Allocation-Secret": secret }
    );
  },

  extend: (type, id, secret, endsAt) => {
    const allowedTypes = ["proxmox", "maas", "openstack"];

    if (!allowedTypes.includes(type)) {
      throw new Error("Unsupported broker type");
    }

    return post(
      `/${type}/allocations/${encodeURIComponent(id)}/extend`,
      { endsAt },
      { "X-Booker-Allocation-Secret": secret }
    );
  },


};