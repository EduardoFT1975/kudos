"use client";
/**
 * AuthBootstrap · KUDOS T3.2 EJEC Day 18.
 *
 * Componente invisible que monta useAuth + useMigrateAnon
 * para ejecutar el cold start de auth y el trasvase anon->user
 * sin necesidad de wrappear el arbol con un Provider.
 */
import * as React from "react";
import { useAuth } from "./useAuth";
import { useMigrateAnon } from "./useMigrateAnon";


export function AuthBootstrap() {
  useAuth();
  useMigrateAnon();
  return null;
}
