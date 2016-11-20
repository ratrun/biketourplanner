/*
 *  Licensed to GraphHopper GmbH under one or more contributor
 *  license agreements. See the NOTICE file distributed with this work for 
 *  additional information regarding copyright ownership.
 * 
 *  GraphHopper GmbH licenses this file to you under the Apache License, 
 *  Version 2.0 (the "License"); you may not use this file except in 
 *  compliance with the License. You may obtain a copy of the License at
 * 
 *       http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.graphhopper.util;

/**
 * @author Peter Karich
 */
public class InstructionAnnotation {
    public final static InstructionAnnotation EMPTY = new InstructionAnnotation();
    private boolean empty;
    private int importance;
    private String message;
    private int waytype;
    private boolean paved;

    private InstructionAnnotation() {
        setEmpty();
    }

    public InstructionAnnotation( int importance, String message, int waytype, boolean paved ) {
        if (message.isEmpty() && importance == 0) {
            setEmpty();
        } else {
            this.empty = false;
            this.importance = importance;
            this.message = message;
        }
        this.waytype = waytype;
        this.paved = paved;
    }

    private void setEmpty() {
        this.empty = true;
        this.importance = 0;
        this.message = "";
        this.waytype = 0;
        this.paved = true;
    }

    public boolean isEmpty() {
        return empty;
    }

    public int getImportance() {
        return importance;
    }

    public String getMessage() {
        return message;
    }

    public int getWayType()
    {
        return waytype;
    }

    public boolean getPaved()
    {
        return paved;
    }

    @Override
    public String toString() {
        return importance + ": " + getMessage();
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 83 * hash + this.importance;
        hash = 83 * hash + (this.message != null ? this.message.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        final InstructionAnnotation other = (InstructionAnnotation) obj;
        if (this.importance != other.importance)
            return false;
        if ((this.message == null) ? (other.message != null) : !this.message.equals(other.message))
            return false;
        if ((this.getWayType() == 0) ? (other.getWayType() != 0) : !(this.getWayType()==other.getWayType()))
            return false;
        if ((this.getPaved() == false) ? (other.getPaved() != false) : !(this.getPaved()==other.getPaved()))
            return false;
        return true;
    }
}
