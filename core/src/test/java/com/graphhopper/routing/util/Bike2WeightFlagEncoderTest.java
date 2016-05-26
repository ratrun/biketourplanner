/*
 *  Licensed to Peter Karich under one or more contributor license
 *  agreements. See the NOTICE file distributed with this work for
 *  additional information regarding copyright ownership.
 *
 *  Peter Karich licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the
 *  License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.graphhopper.routing.util;

import com.graphhopper.reader.OSMWay;
import com.graphhopper.storage.*;
import com.graphhopper.util.*;
import org.junit.Test;

import static org.junit.Assert.*;

/**
 * @author Peter Karich
 */
public class Bike2WeightFlagEncoderTest extends BikeFlagEncoderTest
{
    private final EncodingManager em = new EncodingManager("bike,bike2");

    @Override
    protected BikeCommonFlagEncoder createBikeEncoder()
    {
        return (BikeCommonFlagEncoder) em.getEncoder("bike2");
    }

    private Graph initExampleGraph()
    {
        GraphHopperStorage gs = new GraphHopperStorage(new RAMDirectory(), em, true, new GraphExtension.NoOpExtension()).create(1000);
        NodeAccess na = gs.getNodeAccess();
        // 50--(0.0001)-->49--(0.0004)-->55--(0.0005)-->60
        na.setNode(0, 51.1, 12.001, 50);
        na.setNode(100, 51.1, 12.002, 51);  // +0%
        na.setNode(101, 51.1, 12.002, 51);  // +1%
        na.setNode(102, 51.1, 12.002, 52);  // +2%
        na.setNode(103, 51.1, 12.002, 53);  // +3% 
        na.setNode(104, 51.1, 12.002, 54);  // +4%
        na.setNode(105, 51.1, 12.002, 55);  // +5%
        na.setNode(106, 51.1, 12.002, 56);  // +6%
        na.setNode(107, 51.1, 12.002, 57);  // +7% 
        na.setNode(108, 51.1, 12.002, 58);  // +8%
        na.setNode(109, 51.1, 12.002, 59);  // +9%
        na.setNode(110, 51.1, 12.002, 60);  // +10%
        na.setNode(111, 51.1, 12.002, 61);  // +11%
        na.setNode(112, 51.1, 12.002, 62);  // +12%
        na.setNode(113, 51.1, 12.002, 63);  // +13% 
        na.setNode(114, 51.1, 12.002, 64);  // +14%
        na.setNode(115, 51.1, 12.002, 65);  // +15%
        na.setNode(116, 51.1, 12.002, 66);  // +16%
        na.setNode(117, 51.1, 12.002, 67);  // +17% 
        na.setNode(118, 51.1, 12.002, 68);  // +18%
        na.setNode(119, 51.1, 12.002, 69);  // +19%
        na.setNode(120, 51.1, 12.002, 70);  // +20%
        na.setNode(121, 51.1, 12.002, 71);  // +21%
        na.setNode(122, 51.1, 12.002, 72);  // +22%
        na.setNode(123, 51.1, 12.002, 73);  // +23% 
        na.setNode(124, 51.1, 12.002, 74);  // +24%
        na.setNode(125, 51.1, 12.002, 75);  // +25%
        na.setNode(126, 51.1, 12.002, 76);  // +26%
        na.setNode(127, 51.1, 12.002, 77);  // +27% 
        na.setNode(128, 51.1, 12.002, 78);  // +28%
        na.setNode(129, 51.1, 12.002, 79);  // +29%
        
        for (int i=0;i<=29;i++)
        {
            EdgeIteratorState edge = gs.edge(0, 100 + i).
                    setWayGeometry(Helper.createPointList3D(51.1, 12.0011, 49, 51.1, 12.0015, 55));
            edge.setDistance(100);
            edge.setFlags(encoder.setReverseSpeed(encoder.setProperties(18, true, true), 18));
        }

        return gs;
    }

    @Test
    public void testInclineDeclineSpeedAdaption()
    {
        // http://www.kreuzotter.de/deutsch/speed.htm: 
        /* Size of rider: 1,72 m
           Weight rider: 70kg
           Weight bike 18,0kg
           Temperature: 20
           Elevation: 350m
           Cadence: 90
           -> Requires 80 Watts for 18km/h, which is the speed we assume 
        */
        
        // http://www.gpsies.com/map.do?fileId=ijneuhnaubgyhbtr
        
        int[] speedOnIncline = new int[30];
        speedOnIncline[0] = 18;  // 0%
        speedOnIncline[1] = 14;  // 1%
        speedOnIncline[2] = 11;  // 2%
        speedOnIncline[3] = 18;  // 3%
        speedOnIncline[4] = 18;  // 4%
        speedOnIncline[5] = 18;  // 5%
        speedOnIncline[6] = 18;  // 6%
        speedOnIncline[7] = 18;  // 7%
        speedOnIncline[8] = 18;  // 8%
        speedOnIncline[9] = 18;  // 9%
        speedOnIncline[10] = 18;  // 10%
        speedOnIncline[11] = 18;  // 11%
        speedOnIncline[12] = 18;  // 12%
        speedOnIncline[13] = 18;  // 13%
        speedOnIncline[14] = 18;  // 14%
        speedOnIncline[15] = 18;  // 15%
        speedOnIncline[16] = 18;  // 16%
        speedOnIncline[17] = 18;  // 17%
        speedOnIncline[18] = 18;  // 18%
        speedOnIncline[19] = 18;  // 19%
        speedOnIncline[20] = 18;  // 20%
        speedOnIncline[21] = 18;  // 21%
        speedOnIncline[22] = 18;  // 22%
        speedOnIncline[23] = 18;  // 23%
        speedOnIncline[24] = 18;  // 240%
        speedOnIncline[25] = 18;  // 25%
        speedOnIncline[26] = 18;  // 26%
        speedOnIncline[27] = 18;  // 27%
        speedOnIncline[28] = 18;  // 28%
        speedOnIncline[29] = 1;  // 29%

        int[] speedOnDecline = new int[30];
        speedOnDecline[0] = 18;  // 0%
        speedOnDecline[1] = 18;  // 1%
        speedOnDecline[2] = 18;  // 2%
        speedOnDecline[3] = 18;  // 3%
        speedOnDecline[4] = 18;  // 4%
        speedOnDecline[5] = 18;  // 5%
        speedOnDecline[6] = 18;  // 6%
        speedOnDecline[7] = 18;  // 7%
        speedOnDecline[8] = 18;  // 8%
        speedOnDecline[9] = 18;  // 9%
        speedOnDecline[10] = 18;  // 10%
        speedOnDecline[11] = 18;  // 11%
        speedOnDecline[12] = 18;  // 12%
        speedOnDecline[13] = 18;  // 13%
        speedOnDecline[14] = 18;  // 14%
        speedOnDecline[15] = 18;  // 15%
        speedOnDecline[16] = 18;  // 16%
        speedOnDecline[17] = 18;  // 17%
        speedOnDecline[18] = 18;  // 18%
        speedOnDecline[19] = 18;  // 19%
        speedOnDecline[20] = 18;  // 20%
        speedOnDecline[21] = 18;  // 21%
        speedOnDecline[22] = 18;  // 22%
        speedOnDecline[23] = 18;  // 23%
        speedOnDecline[24] = 18;  // 240%
        speedOnDecline[25] = 18;  // 25%
        speedOnDecline[26] = 18;  // 26%
        speedOnDecline[27] = 18;  // 27%
        speedOnDecline[28] = 18;  // 28%
        speedOnDecline[29] = 18;  // 29%

        Graph graph = initExampleGraph();
        for (int incline=0; incline<=29; incline++)
        {
            EdgeIteratorState edge = GHUtility.getEdge(graph, 0, 100 + incline);
            OSMWay way = new OSMWay(1);
//            way.setTag("highway", "cycleway");
            // FIXME: use speed from bike Flagencoder!
            way.setTag("highway", "footway");
            encoder.applyWayTags(way, edge);
            long flags = edge.getFlags();
            
            System.out.println("incline=+" + (1.0)*incline + " Speed:" + encoder.getSpeed(flags));
            System.out.println("incline=" + (-1.0)*incline + " Speed:" + encoder.getReverseSpeed(flags));
/*            
            // decrease speed
            assertEquals(speedOnIncline[incline], encoder.getSpeed(flags), 1e-1);
            // increase speed but use maximum speed (calculated was 24)
            assertEquals(speedOnDecline[incline], encoder.getReverseSpeed(flags), 1e-1);
*/        
        }
    }

    @Test
    public void testUnchangedForStepsBridgeAndTunnel()
    {
        Graph graph = initExampleGraph();
        EdgeIteratorState edge = GHUtility.getEdge(graph, 0, 110);
        long oldFlags = edge.getFlags();
        OSMWay way = new OSMWay(1);
        way.setTag("highway", "steps");
        encoder.applyWayTags(way, edge);

        assertEquals(oldFlags, edge.getFlags());
    }

    @Test
    public void testSetSpeed0_issue367()
    {
        long flags = encoder.setProperties(10, true, true);
        flags = encoder.setSpeed(flags, 0);

        assertEquals(0, encoder.getSpeed(flags), .1);
        assertEquals(10, encoder.getReverseSpeed(flags), .1);
        assertFalse(encoder.isForward(flags));
        assertTrue(encoder.isBackward(flags));
    }

    @Test
    public void testRoutingFailsWithInvalidGraph_issue665()
    {
        GraphHopperStorage graph = new GraphHopperStorage(
                new RAMDirectory(), em, true, new GraphExtension.NoOpExtension());
        graph.create(100);

        OSMWay way = new OSMWay(0);
        way.setTag("route", "ferry");

        long includeWay = em.acceptWay(way);
        long relationFlags = 0;
        long wayFlags = em.handleWayTags(way, includeWay, relationFlags);
        graph.edge(0, 1).setDistance(247).setFlags(wayFlags);

        assertTrue(isGraphValid(graph, encoder));
    }

    private boolean isGraphValid( Graph graph, FlagEncoder encoder )
    {
        EdgeExplorer explorer = graph.createEdgeExplorer();

        // iterator at node 0 considers the edge 0-1 to be undirected
        EdgeIterator iter0 = explorer.setBaseNode(0);
        iter0.next();
        boolean iter0flag
                = iter0.getBaseNode() == 0 && iter0.getAdjNode() == 1
                && iter0.isForward(encoder) && iter0.isBackward(encoder);

        // iterator at node 1 considers the edge 1-0 to be directed
        EdgeIterator iter1 = explorer.setBaseNode(1);
        iter1.next();
        boolean iter1flag
                = iter1.getBaseNode() == 1 && iter1.getAdjNode() == 0
                && iter1.isForward(encoder) && iter1.isBackward(encoder);

        return iter0flag && iter1flag;
    }
}
