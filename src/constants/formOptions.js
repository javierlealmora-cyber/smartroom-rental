// src/constants/formOptions.js
// Constantes compartidas para formularios en toda la aplicación

export const PROVINCIAS_ES = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona",
  "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba",
  "Cuenca", "Girona", "Granada", "Guadalajara", "Guipúzcoa", "Huelva", "Huesca",
  "Islas Baleares", "Jaén", "La Coruña", "La Rioja", "Las Palmas", "León", "Lleida",
  "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra",
  "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona",
  "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza",
  "Ceuta", "Melilla",
].map((p) => ({ value: p, label: p }));

export const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
];

export const LEGAL_TYPES = [
  { value: "autonomo", label: "Autónomo" },
  { value: "persona_fisica", label: "Persona física" },
  { value: "persona_juridica", label: "Persona jurídica" },
];

export const BATHROOM_OPTIONS = [
  { value: "private", label: "Privado" },
  { value: "shared", label: "Compartido" },
];

export const KITCHEN_OPTIONS = [
  { value: "private", label: "Privada" },
  { value: "shared", label: "Compartida" },
  { value: "none", label: "Sin cocina" },
];
