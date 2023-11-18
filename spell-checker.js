class TrieNode {
  /**
   * Represents a node in a trie data structure.
   * @constructor
   */
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
  }
}

class Trie {
  /**
   * Creates a new instance of the class.
   * @constructor
   */
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Inserts a word into the trie.
   *
   * @param {string} word - The word to be inserted.
   */
  insert(word) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      let char = word[i];
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
  }

  /**
   * Searches for a word in the trie.
   * @param {string} word - The word to search for.
   * @returns {boolean} - True if the word is found, false otherwise.
   */
  search(word) {
    let node = this.root;
    word = word.toLowerCase();
    for (let i = 0; i < word.length; i++) {
      let char = word[i];
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }
    return node.isEndOfWord;
  }
}

export class SpellChecker {
  /**
   * Represents a constructor.
   * @constructor
   * @param {Trie} trie - The trie object.
   */
  constructor(trie) {
    this.trie = trie;
  }

  /**
   * Creates a SpellChecker instance from a dictionary.
   * @param {string} dictionary - The name of the dictionary. Valid options are "popular", "enable1", and "ospd".
   * @returns {Promise<SpellChecker>} A Promise that resolves to a new SpellChecker instance.
   */
  static async createFrom(dictionary) {
    const trie = await createTrieFrom(dictionary);
    return new SpellChecker(trie);
  }

  /**
   * Retrieves suggestions for a given word based on a trie data structure.
   * @param {string} word - The word to find suggestions for.
   * @param {TrieNode} [node=this.trie.root] - The current node in the trie (default: root node).
   * @param {string} [prefix=""] - The prefix formed by traversing the trie (default: empty string).
   * @param {number} [distance=2] - The maximum allowed distance between the word and suggestions (default: 2).
   * @returns {Array} - An array of suggestion objects containing the suggested word and its distance from the input word.
   */
  getSuggestions(word, node = this.trie.root, prefix = "", distance = 2) {
    let suggestions = [];

    if (
      node.isEndOfWord &&
      damerauLevenshteinDistance(word, prefix, distance) <= distance
    ) {
      suggestions.push({
        word: prefix,
        distance: damerauLevenshteinDistance(word, prefix),
      });
    }

    for (let letter in node.children) {
      suggestions = suggestions.concat(
        this.getSuggestions(
          word,
          node.children[letter],
          prefix + letter,
          distance
        )
      );
    }

    // Sort suggestions by distance, then by length
    suggestions.sort(
      (a, b) => a.distance - b.distance || a.word.length - b.word.length
    );

    return suggestions.slice(0, 6);
  }

  /**
   * Checks if a word is valid based on the Trie data structure.
   * @param {string} word - The word to be checked.
   * @returns {object} - An object containing the validity of the word and suggestions if it is invalid.
   */
  check(word) {
    if (this.trie.search(word)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      suggestions: this.getSuggestions(word).map(
        (suggestion) => suggestion.word
      ),
    };
  }
}

/**
 * Loads a dictionary of words from a remote source.
 * @param {string} dictionary - The name of the dictionary to load. Only "popular", "enable1", and "ospd" are valid options.
 * @returns {Promise<string[]>} - A promise that resolves to an array of words from the dictionary.
 */
async function loadWordsFrom(dictionary) {
  const response = await fetch(`dictionaries/${dictionary}.txt`);
  const data = await response.text();
  return data.split("\n");
}

/**
 * Creates a trie data structure from a dictionary.
 * @param {string} dictionary - The name of the dictionary to load. Valid options are "popular", "enable1", and "ospd".
 * @returns {Promise<Trie>} - A promise that resolves to the created trie.
 */
async function createTrieFrom(dictionary) {
  const trie = new Trie();
  let words = await loadWordsFrom(dictionary);

  for (let word of words) {
    trie.insert(word);
  }

  return trie;
}

/**
 * Calculates the Damerau-Levenshtein distance between two strings.
 * The Damerau-Levenshtein distance is the minimum number of operations (insertions, deletions, substitutions, and transpositions) required to transform one string into another.
 * @param {string} s - The source string.
 * @param {string} t - The target string.
 * @param {number} [maxDistance=2] - The maximum allowed distance. If the absolute difference in length between the source and target strings is greater than the maximum distance, the function returns maxDistance + 1.
 * @returns {number} The Damerau-Levenshtein distance between the source and target strings.
 */
function damerauLevenshteinDistance(s, t, maxDistance = 2) {
  if (Math.abs(s.length - t.length) > maxDistance) {
    return maxDistance + 1;
  }

  var m = s.length;
  var n = t.length;
  var inf = m + n;
  var h = new Array(2 * inf + 1);
  var sd = {};
  var currentRow = new Array(n + 2);
  var previousRow = new Array(n + 2);
  var transpositionRow = null;

  for (var l in s + t) {
    sd[l] = 0;
  }

  for (var i = 0; i <= m; i++) {
    previousRow[i] = i;
    sd[s[i - 1]] = 0;
  }

  for (var j = 1; j <= n; j++) {
    currentRow[0] = j;
    var transpositionCost = 0;
    for (i = 1; i <= m; i++) {
      var substitutionCost = s[i - 1] == t[j - 1] ? 0 : 1;
      currentRow[i] = Math.min(
        currentRow[i - 1] + 1,
        previousRow[i] + 1,
        previousRow[i - 1] + substitutionCost
      );
      if (i > 1 && j > 1 && s[i - 1] == t[j - 2] && s[i - 2] == t[j - 1]) {
        currentRow[i] = Math.min(
          currentRow[i],
          transpositionRow[i - 2] + transpositionCost
        );
      }
    }
    transpositionRow = previousRow.slice(0);
    previousRow = currentRow.slice(0);
    currentRow[0] = inf;
  }
  return previousRow[m];
}
