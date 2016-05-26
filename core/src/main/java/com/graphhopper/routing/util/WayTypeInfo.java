/*
 *  Licensed to GraphHopper and Peter Karich under one or more contributor
 *  license agreements. See the NOTICE file distributed with this work for 
 *  additional information regarding copyright ownership.
 *
 *  GraphHopper licenses this file to you under the Apache License, 
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
import com.graphhopper.util.InstructionAnnotation;

/**
 * Class for separate distance detection on verious way types. Desinged fo bicycle usage.
 * @author ratrun
 */
public class WayTypeInfo
{
    private double unpavedDistance;
    private double cyclewayDistance;
    private double roadDistance;
    private double unspecificWayDistance;
    private double pushingSectionDistance;

    public void WayTypeInfo()
    {
        this.unpavedDistance = 0;
        this.cyclewayDistance = 0;
        this.roadDistance = 0;
        this.unspecificWayDistance = 0;
        this.pushingSectionDistance = 0;
    }

    public double getUnpavedDistance()
    {
        return unpavedDistance;
    }
    
    public double getCyclewayDistance()
    {
        return cyclewayDistance;
    }

    public double getRoadDistance()
    {
        return roadDistance;
    }

    public double getUnspecificWayDistance()
    {
        return unspecificWayDistance;
    }

    public double getPushingSectionDistance()
    {
        return pushingSectionDistance;
    }

    public void addDistances(WayTypeInfo mergwaytypeinfo)
    {
        roadDistance += mergwaytypeinfo.getRoadDistance();
        pushingSectionDistance += mergwaytypeinfo.getPushingSectionDistance();
        cyclewayDistance += mergwaytypeinfo.getCyclewayDistance();
        unspecificWayDistance += mergwaytypeinfo.getUnspecificWayDistance();
        unpavedDistance += mergwaytypeinfo.getUnpavedDistance();
    }

    public void classifyDistance(InstructionAnnotation annotation, double distance)
    {

        if ( annotation.getPaved() == false)
        {
            unpavedDistance += distance;
        }

        int waytype = annotation.getWayType();
        switch (waytype)
        {
           case 0:
              // road
              roadDistance += distance;
              break;
           case 1:
              // pushing_section
              pushingSectionDistance += distance;
              break;
           case 2:
              // cycleway
              cyclewayDistance += distance;
              break;
           case 3:
              // way
              unspecificWayDistance += distance;
              break;
           default:
              roadDistance += distance;
              break;
        }
    }

}

