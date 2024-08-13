import { createApp } from "@deroll/app";
// import { createWallet } from "@deroll/wallet";
import { stringToHex, hexToString, getAddress, Address, isAddressEqual, encodeFunctionData } from "viem";
import contractAbi from "./abi.json";

type Candidate = {
  name: string,
  votes: number
}

let contractAddress: Address = "0x"

const candidates = new Map<string, Candidate>()
const voted = new Map<Address, boolean>()

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://localhost:5004" })
const owner = getAddress(process.env.OWNER_ADDRESS || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")

// const wallet = createWallet()
// app.addAdvanceHandler(wallet.handler)

app.addInspectHandler(async ({ payload }) => {
  const payloadSplit = hexToString(payload).split("/")

  try {
    if (payloadSplit[0] === "get_votes") {
      // gets the details for all candidates
      const votes: Array<Candidate> = []
      candidates.forEach((detail) => { votes.push(detail) })

      await app.createReport({ payload: stringToHex(JSON.stringify(votes)) })
    } else if (payloadSplit[0] === "get_vote") {
      // gets the details for a single candidate
      const name = payloadSplit[1] || ""
      if (!isCandidate(name)) { throw new Error("not candidate") }
      const details = candidates.get(name)
      await app.createReport({ payload: stringToHex(JSON.stringify(details)) })
    } else {
      await app.createReport({ payload: stringToHex(`${payloadSplit[0]} route not implemented`) })
    }
  } catch (err) {
    app.createReport({ payload: stringToHex(String(err)) })
  }
}
)

app.addAdvanceHandler(async ({ payload, metadata }) => {
  const payloadJson = JSON.parse(hexToString(payload as `0x${string}`))
  const sender = metadata.msg_sender

  try {
    if (payloadJson.method === "set_address") { // {"method": "set_address", "address": "0x"}
      if (!isOwner(sender)) { throw new Error("not owner") }
      const address = getAddress(payloadJson.address)
      contractAddress = address
      await app.createNotice({ payload: stringToHex(`address changed to ${address}`) })
    } else if (payloadJson.method === "add_candidate") { // {"method": "add_candidate", "name": "Chi"}
      if (!isOwner(sender)) { throw new Error("not owner") }
      const name = payloadJson.name

      if (isCandidate(name)) { throw new Error("candidate already exists") }
      candidates.set(name, { name, votes: 0 })
      await app.createNotice({ payload: stringToHex(`${name} added`) })

    } else if (payloadJson.method === "vote") { // {"method": "vote", "name": "Chi"}
      // vote for a candidate
      const name = payloadJson.name
      if (!isCandidate(name)) { throw new Error("not candidate") }

      const details = candidates.get(name)
      if (typeof details !== "undefined") {
        details.votes += 1
        candidates.set(name, details)
        voted.set(sender, true)

        await app.createNotice({ payload: stringToHex(`${sender} vote ${name}`) })
      }
    } else if (payloadJson.method === "synchronize_vote") { // {"method": "synchronize_vote"}
      // TODO: add logic to update contract state
      if (!isOwner(sender)) { throw new Error("not owner") }
      const votes: Array<Candidate> = []

      candidates.forEach((v) => {
        votes.push(v)
      })

      const calldata = encodeFunctionData(
        {
          abi: contractAbi,
          functionName: "updateVotes",
          args: [votes]
        }
      )

      await app.createVoucher({ payload: calldata, destination: contractAddress })
    } else {
      throw new Error(`${payloadJson.method} route not implemented`)
    }
  } catch (err) {
    await app.createReport({ payload: stringToHex(JSON.stringify({ error: String(err) })) })
    return "reject"
  }

  return "accept"
})

function isOwner(address: Address): Boolean {
  if (isAddressEqual(owner, address)) { return true }
  return false
}

function isCandidate(candidate_name: string): Boolean {
  if (!candidates.has(candidate_name)) { return false }
  return true
}

app.start().catch((err) => {
  console.error(err)
  process.exit(1)
})