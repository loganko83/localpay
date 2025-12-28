/**
 * Merkle Tree Service
 * For batch audit log verification
 */

import { keccak256, toUtf8Bytes } from 'ethers';

export interface MerkleProof {
  leaf: string;
  proof: string[];
  root: string;
  index: number;
}

export interface MerkleTree {
  leaves: string[];
  layers: string[][];
  root: string;
}

/**
 * Hash a single piece of data
 */
export function hashLeaf(data: string | object): string {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  return keccak256(toUtf8Bytes(dataStr));
}

/**
 * Hash two nodes together (sorted for consistency)
 */
function hashPair(a: string, b: string): string {
  // Sort to ensure consistent ordering
  const [left, right] = a < b ? [a, b] : [b, a];
  // Convert hex strings to Uint8Array and concatenate
  const leftBytes = Uint8Array.from(Buffer.from(left.slice(2), 'hex'));
  const rightBytes = Uint8Array.from(Buffer.from(right.slice(2), 'hex'));
  const combined = new Uint8Array(leftBytes.length + rightBytes.length);
  combined.set(leftBytes);
  combined.set(rightBytes, leftBytes.length);
  return keccak256(combined);
}

/**
 * Build a Merkle tree from an array of data items
 */
export function buildMerkleTree(items: (string | object)[]): MerkleTree {
  if (items.length === 0) {
    throw new Error('Cannot build Merkle tree from empty array');
  }

  // Hash all items to create leaves
  const leaves = items.map(hashLeaf);

  // Build tree layers
  const layers: string[][] = [leaves];

  while (layers[layers.length - 1].length > 1) {
    const currentLayer = layers[layers.length - 1];
    const nextLayer: string[] = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      } else {
        // Odd number of nodes - promote the last one
        nextLayer.push(currentLayer[i]);
      }
    }

    layers.push(nextLayer);
  }

  return {
    leaves,
    layers,
    root: layers[layers.length - 1][0],
  };
}

/**
 * Generate a Merkle proof for a specific item
 */
export function generateProof(tree: MerkleTree, index: number): MerkleProof {
  if (index < 0 || index >= tree.leaves.length) {
    throw new Error('Index out of bounds');
  }

  const proof: string[] = [];
  let currentIndex = index;

  for (let i = 0; i < tree.layers.length - 1; i++) {
    const layer = tree.layers[i];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < layer.length) {
      proof.push(layer[siblingIndex]);
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leaf: tree.leaves[index],
    proof,
    root: tree.root,
    index,
  };
}

/**
 * Verify a Merkle proof
 */
export function verifyProof(proof: MerkleProof): boolean {
  let computedHash = proof.leaf;
  let index = proof.index;

  for (const sibling of proof.proof) {
    computedHash = hashPair(computedHash, sibling);
    index = Math.floor(index / 2);
  }

  return computedHash === proof.root;
}

/**
 * Verify that a data item is in the tree
 */
export function verifyInclusion(
  data: string | object,
  proof: string[],
  root: string,
  index: number
): boolean {
  const leaf = hashLeaf(data);
  return verifyProof({ leaf, proof, root, index });
}

/**
 * Create a compact proof string for storage
 */
export function serializeProof(proof: MerkleProof): string {
  return JSON.stringify({
    l: proof.leaf,
    p: proof.proof,
    r: proof.root,
    i: proof.index,
  });
}

/**
 * Parse a compact proof string
 */
export function deserializeProof(proofStr: string): MerkleProof {
  const data = JSON.parse(proofStr);
  return {
    leaf: data.l,
    proof: data.p,
    root: data.r,
    index: data.i,
  };
}

export default {
  hashLeaf,
  buildMerkleTree,
  generateProof,
  verifyProof,
  verifyInclusion,
  serializeProof,
  deserializeProof,
};
